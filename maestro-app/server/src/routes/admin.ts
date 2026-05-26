import { Router } from 'express';
import { z } from 'zod';
import { query, execute, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';
import { getMemberPointsBalance, processMemberBilling } from '../services/loyaltyEngine.js';
import {
  runErpImport,
  getImportStatusFromDb,
  DEFAULT_ERP_IMPORT_PATH,
  resolveImportPath,
} from '../services/erpImportService.js';
import { TIER_LABELS } from '../config.js';
import type { TierCode } from '../config.js';

const router = Router();
router.use(requireAuth(['ADMIN']));

const FORBIDDEN_SQL =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE|GRANT|REVOKE|EXEC|EXECUTE)\b/i;

router.get('/dashboard', async (_req, res) => {
  const [members, purchases, points, redemptions] = await Promise.all([
    query<{ CNT: number }>(`SELECT COUNT(*) AS CNT FROM CLAN WHERE AKTIVEN = 'Y'`),
    query<{ TOTAL: number }>(`SELECT NVL(SUM(ZNESEK), 0) AS TOTAL FROM NAKUP`),
    query<{ TOTAL: number }>(
      `SELECT NVL(SUM(CASE WHEN STEVILO_TOCK > 0 THEN STEVILO_TOCK ELSE 0 END), 0) AS TOTAL FROM TOCKE_TRANSAKCIJA`
    ),
    query<{ CNT: number }>(`SELECT COUNT(*) AS CNT FROM UVELJAVITEV_NAGRADE`),
  ]);

  const tierDist = await query<{ TIER: string; CNT: number }>(
    `SELECT n.NAZIV_EN AS TIER, COUNT(*) AS CNT
     FROM STATUS_CLANA s
     JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.TRENUTNI = 'Y'
     GROUP BY n.NAZIV_EN`
  );

  const monthly = await query<{ MESEC: number; LETO: number; TOTAL: number }>(
    `SELECT o.MESEC, o.LETO, NVL(SUM(n.ZNESEK), 0) AS TOTAL
     FROM OBRACUNSKO_OBDOBJE o
     LEFT JOIN NAKUP n ON n.ID_OBDOBJA = o.ID_OBDOBJA
     GROUP BY o.MESEC, o.LETO
     ORDER BY o.LETO DESC, o.MESEC DESC
     FETCH FIRST 12 ROWS ONLY`
  );

  res.json({
    totalMembers: Number(members[0]?.CNT ?? 0),
    totalPurchaseVolume: Number(purchases[0]?.TOTAL ?? 0),
    totalPointsIssued: Number(points[0]?.TOTAL ?? 0),
    totalRedemptions: Number(redemptions[0]?.CNT ?? 0),
    tierDistribution: tierDist.map((t) => ({
      tier: t.TIER,
      count: Number(t.CNT),
    })),
    monthlyPurchases: monthly.map((m) => ({
      month: Number(m.MESEC),
      year: Number(m.LETO),
      total: Number(m.TOTAL),
      label: `${m.MESEC}/${m.LETO}`,
    })),
  });
});

router.get('/customers', async (req, res) => {
  const tier = req.query.tier as string | undefined;
  const search = (req.query.search as string)?.toLowerCase();

  let sql = `
    SELECT c.ID_CLANA, c.IME, c.PRIIMEK, c.EMAIL, c.DATUM_REGISTRACIJE, c.AKTIVEN,
           n.NAZIV_EN AS TIER, n.KODA AS TIER_CODE
    FROM CLAN c
    LEFT JOIN STATUS_CLANA s ON s.ID_CLANA = c.ID_CLANA AND s.TRENUTNI = 'Y'
    LEFT JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
    WHERE 1=1`;
  const binds: Record<string, unknown> = {};

  if (tier) {
    sql += ` AND n.NAZIV_EN = :tier`;
    binds.tier = tier;
  }
  if (search) {
    sql += ` AND (LOWER(c.EMAIL) LIKE :search OR LOWER(c.IME) LIKE :search OR LOWER(c.PRIIMEK) LIKE :search)`;
    binds.search = `%${search}%`;
  }
  sql += ` ORDER BY c.DATUM_REGISTRACIJE DESC`;

  const rows = await query<{
    ID_CLANA: number;
    IME: string;
    PRIIMEK: string;
    EMAIL: string;
    DATUM_REGISTRACIJE: Date;
    AKTIVEN: string;
    TIER: string;
    TIER_CODE: TierCode;
  }>(sql, binds);

  const customers = await Promise.all(
    rows.map(async (r) => ({
      id: String(r.ID_CLANA),
      firstName: r.IME,
      lastName: r.PRIIMEK,
      email: r.EMAIL,
      tier: r.TIER ?? 'Basic',
      active: r.AKTIVEN === 'Y',
      registrationDate: r.DATUM_REGISTRACIJE,
      points: await getMemberPointsBalance(r.ID_CLANA),
    }))
  );

  res.json(customers);
});

router.get('/customers/:id/status-history', async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  if (isNaN(memberId)) {
    res.status(400).json({ error: 'Invalid member id' });
    return;
  }

  const exists = await query(`SELECT ID_CLANA FROM CLAN WHERE ID_CLANA = :memberId`, {
    memberId,
  });
  if (!exists.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const rows = await query<{
    NAZIV_EN: string;
    NAZIV_SL: string;
    KODA: TierCode;
    DATUM_OD: Date;
    DATUM_DO: Date | null;
    RAZLOG_SPREMEMBE: string;
    TRENUTNI: string;
  }>(
    `SELECT n.NAZIV_EN, n.NAZIV_SL, n.KODA, s.DATUM_OD, s.DATUM_DO, s.RAZLOG_SPREMEMBE, s.TRENUTNI
     FROM STATUS_CLANA s
     JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_CLANA = :memberId
     ORDER BY s.DATUM_OD DESC`,
    { memberId }
  );

  res.json(
    rows.map((r) => ({
      tier: r.NAZIV_EN,
      tierSl: r.NAZIV_SL,
      tierCode: r.KODA,
      from: r.DATUM_OD,
      to: r.DATUM_DO,
      reason: r.RAZLOG_SPREMEMBE,
      current: r.TRENUTNI === 'Y',
    }))
  );
});

router.get('/customers/:id/points', async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  if (isNaN(memberId)) {
    res.status(400).json({ error: 'Invalid member id' });
    return;
  }

  const exists = await query(`SELECT ID_CLANA FROM CLAN WHERE ID_CLANA = :memberId`, {
    memberId,
  });
  if (!exists.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const balance = await getMemberPointsBalance(memberId);
  const rows = await query<{
    ID_TRANSAKCIJE: number;
    DATUM: Date;
    STEVILO_TOCK: number;
    TIP: string;
    OPIS: string;
  }>(
    `SELECT ID_TRANSAKCIJE, DATUM, STEVILO_TOCK, TIP, OPIS
     FROM TOCKE_TRANSAKCIJA
     WHERE ID_CLANA = :memberId
     ORDER BY DATUM DESC`,
    { memberId }
  );

  res.json({
    memberId: String(memberId),
    balance,
    history: rows.map((r) => ({
      id: String(r.ID_TRANSAKCIJE),
      date: r.DATUM,
      points: Number(r.STEVILO_TOCK),
      type: r.TIP,
      description: r.OPIS,
    })),
  });
});

const pointsCorrectionSchema = z.object({
  points: z.number(),
  reason: z.string().min(1).max(500),
});

router.put('/customers/:id/points', async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  if (isNaN(memberId)) {
    res.status(400).json({ error: 'Invalid member id' });
    return;
  }

  const parsed = pointsCorrectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const exists = await query<{ AKTIVEN: string }>(
    `SELECT AKTIVEN FROM CLAN WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  if (!exists.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { points, reason } = parsed.data;
  const oldBalance = await getMemberPointsBalance(memberId);

  await withTransaction(async (conn) => {
    const ptsResult = await conn.execute<{ ID: number }>(
      `SELECT seq_tocke.NEXTVAL AS ID FROM DUAL`,
      {},
      { autoCommit: false }
    );
    const txId = Number((ptsResult.rows as { ID: number }[])[0].ID);

    await conn.execute(
      `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
       VALUES (:txId, :memberId, :points, 'MANUAL_ADJUSTMENT', :opis)`,
      {
        txId,
        memberId,
        points,
        opis: reason,
      },
      { autoCommit: false }
    );
  });

  const newBalance = await getMemberPointsBalance(memberId);

  await logAudit({
    accountId: req.user!.accountId,
    eventType: 'MANUAL_POINTS_CORRECTION',
    entity: 'CLAN',
    entityId: memberId,
    details: `Reason: ${reason}. ${oldBalance} -> ${newBalance} (${points >= 0 ? '+' : ''}${points})`,
    ip: req.ip,
  });

  res.json({
    success: true,
    memberId: String(memberId),
    previousBalance: oldBalance,
    adjustment: points,
    balance: newBalance,
    reason,
  });
});

router.get('/customers/:id', async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  const clan = await query(`SELECT * FROM CLAN WHERE ID_CLANA = :memberId`, {
    memberId,
  });
  if (!clan.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const statusHistory = await query(
    `SELECT n.NAZIV_EN, s.DATUM_OD, s.DATUM_DO, s.RAZLOG_SPREMEMBE
     FROM STATUS_CLANA s JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_CLANA = :memberId ORDER BY s.DATUM_OD DESC`,
    { memberId }
  );
  const purchases = await query(
    `SELECT n.ZNESEK, o.MESEC, o.LETO FROM NAKUP n
     JOIN OBRACUNSKO_OBDOBJE o ON o.ID_OBDOBJA = n.ID_OBDOBJA
     WHERE n.ID_CLANA = :memberId ORDER BY o.LETO DESC, o.MESEC DESC`,
    { memberId }
  );

  res.json({
    ...clan[0],
    statusHistory,
    purchases,
    points: await getMemberPointsBalance(memberId),
  });
});

router.get('/rewards', async (req, res) => {
  const rows = await query(
    `SELECT n.*, k.NAZIV_EN AS KATEGORIJA FROM NAGRADA n
     LEFT JOIN KATEGORIJA_NAGRADE k ON k.ID_KATEGORIJE = n.ID_KATEGORIJE
     ORDER BY n.ID_NAGRADE`
  );
  res.json(rows);
});

const rewardSchema = z.object({
  nameSl: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionSl: z.string().optional(),
  descriptionEn: z.string().optional(),
  pointsCost: z.number().positive(),
  stock: z.number().int().min(0),
  categoryId: z.number().optional(),
  active: z.boolean().optional(),
});

router.post('/rewards', async (req, res) => {
  const parsed = rewardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  try {
    await execute(
      `INSERT INTO NAGRADA (ID_NAGRADE, ID_KATEGORIJE, NAZIV_SL, NAZIV_EN, OPIS_SL, OPIS_EN, VREDNOST_V_TOCKAH, ZALOGA, AKTIVNA)
       VALUES (seq_nagrada.NEXTVAL, :categoryId, :nameSl, :nameEn, :descSl, :descEn, :points, :stock, :active)`,
      {
        categoryId: d.categoryId ?? null,
        nameSl: d.nameSl,
        nameEn: d.nameEn,
        descSl: d.descriptionSl ?? null,
        descEn: d.descriptionEn ?? null,
        points: d.pointsCost,
        stock: d.stock,
        active: d.active !== false ? 'Y' : 'N',
      }
    );
    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'REWARD_CREATED',
      entity: 'NAGRADA',
      details: d.nameEn,
    });
    res.status(201).json({ success: true });
  } catch (e) {
    console.error('Error creating reward:', e);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

router.put('/rewards/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const parsed = rewardSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  try {
    await execute(
      `UPDATE NAGRADA SET
         NAZIV_SL = NVL(:nameSl, NAZIV_SL),
         NAZIV_EN = NVL(:nameEn, NAZIV_EN),
         OPIS_SL = NVL(:descSl, OPIS_SL),
         OPIS_EN = NVL(:descEn, OPIS_EN),
         VREDNOST_V_TOCKAH = NVL(:points, VREDNOST_V_TOCKAH),
         ZALOGA = NVL(:stock, ZALOGA),
         AKTIVNA = NVL(:active, AKTIVNA)
       WHERE ID_NAGRADE = :id`,
      {
        id,
        nameSl: d.nameSl ?? null,
        nameEn: d.nameEn ?? null,
        descSl: d.descriptionSl ?? null,
        descEn: d.descriptionEn ?? null,
        points: d.pointsCost ?? null,
        stock: d.stock ?? null,
        active: d.active === undefined ? null : d.active ? 'Y' : 'N',
      }
    );
    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'REWARD_UPDATED',
      entity: 'NAGRADA',
      entityId: id,
      details: d.nameEn ?? 'Reward updated',
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Error updating reward:', e);
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

router.delete('/rewards/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await execute(`DELETE FROM NAGRADA WHERE ID_NAGRADE = :id`, { id });
    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'REWARD_DELETED',
      entity: 'NAGRADA',
      entityId: id,
      details: `Reward ${id} permanently deleted`,
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting reward:', e);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

router.get('/rules/status', async (_req, res) => {
  const rows = await query(
    `SELECT ID_PRAVILA, TIP_PRAVILA, POGOJ_OPIS, PRAG_ZNESEK, STEVILO_MESECEV
     FROM PRAVILO_STATUSA WHERE AKTIVNO = 'Y' ORDER BY ID_PRAVILA`
  );
  res.json(rows);
});

router.get('/rules/points', async (_req, res) => {
  const rows = await query(
    `SELECT pt.ID_PRAVILA, pt.ID_NIVOJA, pt.ZNESEK_OD, pt.ZNESEK_DO, pt.TOCKE, n.KODA, n.NAZIV_EN
     FROM PRAVILO_TOCKOVANJA pt
     JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = pt.ID_NIVOJA
     WHERE pt.AKTIVNO = 'Y' ORDER BY n.KODA, pt.ZNESEK_OD`
  );
  res.json(rows);
});

router.put('/rules/points', async (req, res) => {
  const { rules } = req.body as {
    rules: Array<{ id: number; points: number }>;
  };
  if (!Array.isArray(rules)) {
    res.status(400).json({ error: 'rules array required' });
    return;
  }

  const changes: Array<{ id: number; tier: string; bracket: string; oldPoints: number; newPoints: number }> = [];

  await withTransaction(async (conn) => {
    for (const r of rules) {
      const existing = await conn.execute<{
        TOCKE: number;
        NAZIV_EN: string;
        ZNESEK_OD: number;
        ZNESEK_DO: number | null;
      }>(
        `SELECT pt.TOCKE, n.NAZIV_EN, pt.ZNESEK_OD, pt.ZNESEK_DO
         FROM PRAVILO_TOCKOVANJA pt
         JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = pt.ID_NIVOJA
         WHERE pt.ID_PRAVILA = :id`,
        { id: r.id },
        { autoCommit: false }
      );
      const row = (existing.rows as { TOCKE: number; NAZIV_EN: string; ZNESEK_OD: number; ZNESEK_DO: number | null }[])?.[0];
      if (!row) continue;

      const oldPoints = Number(row.TOCKE);
      const newPoints = Number(r.points);
      if (oldPoints === newPoints) continue;

      await conn.execute(
        `UPDATE PRAVILO_TOCKOVANJA SET TOCKE = :points WHERE ID_PRAVILA = :id`,
        { id: r.id, points: newPoints },
        { autoCommit: false }
      );

      const bracket =
        Number(row.ZNESEK_OD) === 0
          ? 'upTo200'
          : row.ZNESEK_DO == null
            ? 'over1000'
            : 'from200To1000';

      changes.push({
        id: r.id,
        tier: row.NAZIV_EN,
        bracket,
        oldPoints,
        newPoints,
      });
    }
  });

  for (const change of changes) {
    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'RULE_CHANGE',
      entity: 'PRAVILO_TOCKOVANJA',
      entityId: change.id,
      details: {
        descriptionKey: 'admin.audit.desc.pointsRuleUpdated',
        description: `Updated points rule for ${change.tier}`,
        affectedMember: '-',
        oldValue: String(change.oldPoints),
        newValue: String(change.newPoints),
        fieldKey: `admin.rules.bracket.${change.bracket}`,
        tier: change.tier,
      },
      ip: req.ip,
    });
  }

  res.json({ success: true, changes: changes.length });
});

router.put('/rules/status/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { thresholdAmount, consecutiveMonths } = req.body as {
    thresholdAmount?: number;
    consecutiveMonths?: number;
  };

  const before = await query<{
    TIP_PRAVILA: string;
    PRAG_ZNESEK: number;
    STEVILO_MESECEV: number;
  }>(`SELECT TIP_PRAVILA, PRAG_ZNESEK, STEVILO_MESECEV FROM PRAVILO_STATUSA WHERE ID_PRAVILA = :id`, {
    id,
  });

  if (!before.length) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const old = before[0];
  const newAmount = thresholdAmount ?? Number(old.PRAG_ZNESEK);
  const newMonths = consecutiveMonths ?? Number(old.STEVILO_MESECEV);

  await execute(
    `UPDATE PRAVILO_STATUSA SET
       PRAG_ZNESEK = :amount,
       STEVILO_MESECEV = :months
     WHERE ID_PRAVILA = :id`,
    { id, amount: newAmount, months: newMonths }
  );

  if (Number(old.PRAG_ZNESEK) !== newAmount || Number(old.STEVILO_MESECEV) !== newMonths) {
    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'RULE_CHANGE',
      entity: 'PRAVILO_STATUSA',
      entityId: id,
      details: {
        descriptionKey: 'admin.audit.desc.statusRuleUpdated',
        description: `Updated status rule ${old.TIP_PRAVILA}`,
        affectedMember: '-',
        oldValue: `€${Number(old.PRAG_ZNESEK)}, ${Number(old.STEVILO_MESECEV)} months`,
        newValue: `€${newAmount}, ${newMonths} months`,
        ruleType: old.TIP_PRAVILA,
      },
      ip: req.ip,
    });
  }

  res.json({ success: true });
});

router.get('/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10), 500);
    const rows = await query(
      `SELECT r.ID, r.CAS_DOGODKA, r.TIP_DOGODKA, r.ENTITETA, r.ID_ENTITETE, r.PODROBNOSTI, r.IP_NASLOV, u.UPORABNISKO_IME
       FROM REVIZIJSKI_DNEVNIK r
       LEFT JOIN UPORABNISK_RACUN u ON u.ID_RACUNA = r.ID_RACUNA
       ORDER BY r.CAS_DOGODKA DESC
       FETCH FIRST :limit ROWS ONLY`,
      { limit }
    );
    res.json(rows);
  } catch (e) {
    console.error('Audit log fetch failed', e);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

router.post('/import/trigger', async (req, res) => {
  const provided = (req.body as { filePath?: string })?.filePath;
  const filePath = provided ?? process.env.ERP_IMPORT_PATH ?? DEFAULT_ERP_IMPORT_PATH;
  const absPath = resolveImportPath(String(filePath));

  try {
    const result = await runErpImport(absPath, {
      toggle: true,
      audit: { accountId: req.user!.accountId, ip: req.ip, source: 'ERP_IMPORT' },
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Import failed' });
  }
});

router.post('/billing/trigger', async (req, res) => {
  // Accept optional month/year in body; default to current month/year
  const { month, year } = req.body as { month?: number; year?: number };
  const m = month ?? new Date().getMonth() + 1;
  const y = year ?? new Date().getFullYear();

  try {
    // Ensure period exists
    let rows = await query<{ ID_OBDOBJA: number }>(
      `SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = :month AND LETO = :year`,
      { month: m, year: y }
    );
    let periodId = rows[0]?.ID_OBDOBJA;
    if (!periodId) {
      // Create period with PROCESSING status
      await query(
        `INSERT INTO OBRACUNSKO_OBDOBJE (ID_OBDOBJA, MESEC, LETO, STATUS_UVOZA)
         VALUES (seq_obdobje.NEXTVAL, :month, :year, 'PROCESSING')`,
        { month: m, year: y }
      );
      rows = await query(`SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = :month AND LETO = :year`, { month: m, year: y });
      periodId = rows[0].ID_OBDOBJA;
    }

    await query(`UPDATE OBRACUNSKO_OBDOBJE SET STATUS_UVOZA = 'PROCESSING' WHERE ID_OBDOBJA = :periodId`, { periodId });

    const purchases = await query<{ ID_CLANA: number; ZNESEK: number }>(
      `SELECT ID_CLANA, ZNESEK FROM NAKUP WHERE ID_OBDOBJA = :periodId`,
      { periodId }
    );

    const results: Array<{ memberId: number; tierChanged: boolean; pointsAwarded: number; newTier: string }> = [];
    for (const p of purchases) {
      const r = await processMemberBilling(p.ID_CLANA, periodId, Number(p.ZNESEK));
      results.push({ memberId: p.ID_CLANA, tierChanged: r.tierChanged, pointsAwarded: r.pointsAwarded, newTier: r.newTier });
    }

    await query(`UPDATE OBRACUNSKO_OBDOBJE SET STATUS_UVOZA = 'CLOSED', DATUM_UVOZA = SYSTIMESTAMP WHERE ID_OBDOBJA = :periodId`, { periodId });

    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'BILLING_TRIGGERED',
      entity: 'OBRACUNSKO_OBDOBJE',
      details: JSON.stringify({ month: m, year: y, processed: results.length }),
      ip: req.ip,
    });

    res.json({ success: true, processed: results.length, details: results.slice(0, 50) });
  } catch (e) {
    console.error('Billing trigger failed', e);
    res.status(500).json({ error: 'Billing failed' });
  }
});

router.get('/import/status', async (_req, res) => {
  try {
    const status = await getImportStatusFromDb();
    if (!status) {
      res.json({
        timestamp: null,
        recordsProcessed: 0,
        errors: [],
        status: 'idle',
      });
      return;
    }
    res.json(status);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to read import status' });
  }
});

router.post('/sql', async (req, res) => {
  const { sql } = req.body as { sql?: string };
  if (!sql?.trim()) {
    res.status(400).json({ error: 'SQL required' });
    return;
  }
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (FORBIDDEN_SQL.test(trimmed)) {
    res.status(403).json({ error: 'Only SELECT queries are allowed' });
    return;
  }
  if (!/^\s*SELECT\b/i.test(trimmed)) {
    res.status(403).json({ error: 'Only SELECT queries are allowed' });
    return;
  }

  try {
    const rows = await query(trimmed);
    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'SQL_QUERY',
      details: trimmed.slice(0, 500),
      ip: req.ip,
    });
    res.json({
      columns: rows.length ? Object.keys(rows[0]) : [],
      rows,
      rowCount: rows.length,
    });
  } catch (e) {
    res.status(400).json({
      error: e instanceof Error ? e.message : 'Query failed',
    });
  }
});

export default router;

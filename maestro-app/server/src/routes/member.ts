import { Router } from 'express';
import { z } from 'zod';
import { query, execute, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getMemberPointsBalance } from '../services/loyaltyEngine.js';
import { logAudit } from '../services/auditService.js';
import { TIER_LABELS } from '../config.js';
import type { TierCode } from '../config.js';

const router = Router();
router.use(requireAuth(['CLAN']));

function tierEn(code: TierCode): string {
  return TIER_LABELS[code]?.en ?? 'Basic';
}

router.get('/me', async (req, res) => {
  const memberId = req.user!.memberId!;
  const clanRows = await query<{
    IME: string;
    PRIIMEK: string;
    EMAIL: string;
    NASLOV: string;
    DATUM_REGISTRACIJE: Date;
  }>(`SELECT IME, PRIIMEK, EMAIL, NASLOV, DATUM_REGISTRACIJE FROM CLAN WHERE ID_CLANA = :memberId`, {
    memberId,
  });
  const tierRows = await query<{ KODA: TierCode }>(
    `SELECT n.KODA FROM STATUS_CLANA s JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_CLANA = :memberId AND s.TRENUTNI = 'Y'`,
    { memberId }
  );
  const cardRows = await query<{ STEVILKA_KARTICE: string; STATUS_POSILJANJA: string }>(
    `SELECT STEVILKA_KARTICE, STATUS_POSILJANJA FROM KARTICA_LOJALNOSTI WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  const points = await getMemberPointsBalance(memberId);
  const clan = clanRows[0];
  const cardStatusMap: Record<string, string> = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
  };

  res.json({
    id: String(memberId),
    firstName: clan.IME,
    lastName: clan.PRIIMEK,
    email: clan.EMAIL,
    tier: tierEn(tierRows[0]?.KODA ?? 'OSNOVNI'),
    points,
    cardNumber: cardRows[0]?.STEVILKA_KARTICE ?? '',
    cardStatus: cardStatusMap[cardRows[0]?.STATUS_POSILJANJA] ?? 'pending',
    address: clan.NASLOV,
    registrationDate: clan.DATUM_REGISTRACIJE,
  });
});

router.get('/purchases', async (req, res) => {
  const memberId = req.user!.memberId!;
  const rows = await query<{
    ID_NAKUPA: number;
    ZNESEK: number;
    MESEC: number;
    LETO: number;
    DATUM_UVOZA: Date;
    STATUS_UVOZA: string;
    POINTS_EARNED: number | null;
    TIER_CODE: TierCode | null;
    HAS_BILLING: number;
  }>(
    `SELECT n.ID_NAKUPA, n.ZNESEK, o.MESEC, o.LETO, n.DATUM_UVOZA, o.STATUS_UVOZA,
            (SELECT NVL(SUM(t.STEVILO_TOCK), 0)
             FROM TOCKE_TRANSAKCIJA t
             WHERE t.ID_CLANA = n.ID_CLANA AND t.ID_OBDOBJA = o.ID_OBDOBJA AND t.TIP = 'EARNED') AS POINTS_EARNED,
            (SELECT COUNT(*)
             FROM TOCKE_TRANSAKCIJA t
             WHERE t.ID_CLANA = n.ID_CLANA AND t.ID_OBDOBJA = o.ID_OBDOBJA AND t.TIP = 'EARNED') AS HAS_BILLING,
            (SELECT n2.KODA
             FROM STATUS_CLANA s
             JOIN NIVO_LOJALNOSTI n2 ON n2.ID_NIVOJA = s.ID_NIVOJA
             WHERE s.ID_CLANA = n.ID_CLANA
               AND s.DATUM_OD <= NVL(o.DATUM_UVOZA, n.DATUM_UVOZA)
             ORDER BY s.DATUM_OD DESC
             FETCH FIRST 1 ROW ONLY) AS TIER_CODE
     FROM NAKUP n JOIN OBRACUNSKO_OBDOBJE o ON o.ID_OBDOBJA = n.ID_OBDOBJA
     WHERE n.ID_CLANA = :memberId
     ORDER BY o.LETO DESC, o.MESEC DESC`,
    { memberId }
  );

  res.json(
    rows.map((r) => ({
      id: String(r.ID_NAKUPA),
      amount: Number(r.ZNESEK),
      month: Number(r.MESEC),
      year: Number(r.LETO),
      period: `${r.MESEC}/${r.LETO}`,
      importDate: r.DATUM_UVOZA,
      pointsEarned: Number(r.POINTS_EARNED ?? 0),
      billed: Number(r.HAS_BILLING) > 0,
      tierAtTime: r.TIER_CODE ? tierEn(r.TIER_CODE) : null,
    }))
  );
});

router.get('/points', async (req, res) => {
  const memberId = req.user!.memberId!;
  const balance = await getMemberPointsBalance(memberId);
  const rows = await query<{
    ID_TRANSAKCIJE: number;
    DATUM: Date;
    STEVILO_TOCK: number;
    TIP: string;
    OPIS: string;
  }>(
    `SELECT ID_TRANSAKCIJE, DATUM, STEVILO_TOCK, TIP, OPIS
     FROM TOCKE_TRANSAKCIJA WHERE ID_CLANA = :memberId ORDER BY DATUM DESC`,
    { memberId }
  );

  res.json({
    balance,
    transactions: rows.map((r) => ({
      id: String(r.ID_TRANSAKCIJE),
      date: r.DATUM,
      points: Number(r.STEVILO_TOCK),
      type: r.TIP,
      description: r.OPIS,
    })),
  });
});

router.get('/status-history', async (req, res) => {
  const memberId = req.user!.memberId!;
  const rows = await query<{
    NAZIV_EN: string;
    DATUM_OD: Date;
    DATUM_DO: Date | null;
    RAZLOG_SPREMEMBE: string;
  }>(
    `SELECT n.NAZIV_EN, s.DATUM_OD, s.DATUM_DO, s.RAZLOG_SPREMEMBE
     FROM STATUS_CLANA s JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_CLANA = :memberId ORDER BY s.DATUM_OD DESC`,
    { memberId }
  );
  res.json(rows);
});

router.get('/rewards', async (req, res) => {
  const lang = (req.query.lang as string) === 'sl' ? 'sl' : 'en';
  const rows = await query<{
    ID_NAGRADE: number;
    NAZIV_SL: string;
    NAZIV_EN: string;
    OPIS_SL: string;
    OPIS_EN: string;
    VREDNOST_V_TOCKAH: number;
    ZALOGA: number;
    KATEGORIJA: string;
  }>(
    `SELECT n.ID_NAGRADE, n.NAZIV_SL, n.NAZIV_EN, n.OPIS_SL, n.OPIS_EN,
            n.VREDNOST_V_TOCKAH, n.ZALOGA,
            k.NAZIV_EN AS KATEGORIJA
     FROM NAGRADA n
     LEFT JOIN KATEGORIJA_NAGRADE k ON k.ID_KATEGORIJE = n.ID_KATEGORIJE
     WHERE n.AKTIVNA = 'Y' AND n.ZALOGA > 0
     ORDER BY n.VREDNOST_V_TOCKAH`
  );

  res.json(
    rows.map((r) => ({
      id: String(r.ID_NAGRADE),
      name: lang === 'sl' ? r.NAZIV_SL : r.NAZIV_EN,
      description: lang === 'sl' ? r.OPIS_SL : r.OPIS_EN,
      pointsCost: Number(r.VREDNOST_V_TOCKAH),
      stock: Number(r.ZALOGA),
      category: r.KATEGORIJA,
    }))
  );
});

router.post('/rewards/:id/redeem', async (req, res) => {
  const memberId = req.user!.memberId!;
  const rewardId = parseInt(req.params.id, 10);
  if (isNaN(rewardId)) {
    res.status(400).json({ error: 'Invalid reward id' });
    return;
  }

  try {
    await withTransaction(async (conn) => {
      const rewardRows = await conn.execute<{
        VREDNOST_V_TOCKAH: number;
        ZALOGA: number;
        NAZIV_EN: string;
      }>(
        `SELECT VREDNOST_V_TOCKAH, ZALOGA, NAZIV_EN FROM NAGRADA
         WHERE ID_NAGRADE = :rewardId AND AKTIVNA = 'Y' FOR UPDATE`,
        { rewardId },
        { autoCommit: false }
      );
      const reward = (rewardRows.rows as typeof rewardRows extends never
        ? never
        : { VREDNOST_V_TOCKAH: number; ZALOGA: number; NAZIV_EN: string }[])?.[0];
      if (!reward || reward.ZALOGA < 1) {
        throw new Error('REWARD_UNAVAILABLE');
      }

      const balance = await getMemberPointsBalance(memberId);
      if (balance < reward.VREDNOST_V_TOCKAH) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      const ptsResult = await conn.execute<{ ID: number }>(
        `SELECT seq_tocke.NEXTVAL AS ID FROM DUAL`,
        {},
        { autoCommit: false }
      );
      const txId = Number((ptsResult.rows as { ID: number }[])[0].ID);

      await conn.execute(
        `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
         VALUES (:txId, :memberId, :points, 'REDEEMED', :opis)`,
        {
          txId,
          memberId,
          points: -reward.VREDNOST_V_TOCKAH,
          opis: `Uveljavitev nagrade: ${reward.NAZIV_EN}`,
        },
        { autoCommit: false }
      );

      await conn.execute(
        `INSERT INTO UVELJAVITEV_NAGRADE (ID_UVELJAVITVE, ID_CLANA, ID_NAGRADE, ID_TRANSAKCIJE, PORABLJENE_TOCKE)
         VALUES (seq_uveljavitev.NEXTVAL, :memberId, :rewardId, :txId, :points)`,
        {
          memberId,
          rewardId,
          txId,
          points: reward.VREDNOST_V_TOCKAH,
        },
        { autoCommit: false }
      );

      await conn.execute(
        `UPDATE NAGRADA SET ZALOGA = ZALOGA - 1 WHERE ID_NAGRADE = :rewardId`,
        { rewardId },
        { autoCommit: false }
      );
    });

    const newBalance = await getMemberPointsBalance(memberId);
    await logAudit({
      accountId: req.user!.accountId,
      eventType: 'REWARD_REDEEMED',
      entity: 'NAGRADA',
      entityId: rewardId,
      details: `Member ${memberId}`,
    });

    res.json({ success: true, balance: newBalance });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'INSUFFICIENT_POINTS') {
      res.status(400).json({ error: 'Insufficient points' });
      return;
    }
    if (msg === 'REWARD_UNAVAILABLE') {
      res.status(400).json({ error: 'Reward unavailable' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Redemption failed' });
  }
});

const profileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  address: z.string().min(1).max(500),
});

router.put('/me/profile', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const memberId = req.user!.memberId!;
  const { firstName, lastName, address } = parsed.data;

  const active = await query<{ AKTIVEN: string }>(
    `SELECT AKTIVEN FROM CLAN WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  if (!active.length || active[0].AKTIVEN !== 'Y') {
    res.status(403).json({ error: 'Account is not active' });
    return;
  }

  await execute(
    `UPDATE CLAN SET IME = :firstName, PRIIMEK = :lastName, NASLOV = :address
     WHERE ID_CLANA = :memberId`,
    { memberId, firstName, lastName, address }
  );

  await logAudit({
    accountId: req.user!.accountId,
    eventType: 'PROFILE_UPDATED',
    entity: 'CLAN',
    entityId: memberId,
    details: `Updated profile for member ${memberId}`,
  });

  const clanRows = await query<{
    IME: string;
    PRIIMEK: string;
    EMAIL: string;
    NASLOV: string;
    DATUM_REGISTRACIJE: Date;
  }>(`SELECT IME, PRIIMEK, EMAIL, NASLOV, DATUM_REGISTRACIJE FROM CLAN WHERE ID_CLANA = :memberId`, {
    memberId,
  });
  const tierRows = await query<{ KODA: TierCode }>(
    `SELECT n.KODA FROM STATUS_CLANA s JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_CLANA = :memberId AND s.TRENUTNI = 'Y'`,
    { memberId }
  );
  const cardRows = await query<{ STEVILKA_KARTICE: string; STATUS_POSILJANJA: string }>(
    `SELECT STEVILKA_KARTICE, STATUS_POSILJANJA FROM KARTICA_LOJALNOSTI WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  const points = await getMemberPointsBalance(memberId);
  const clan = clanRows[0];
  const cardStatusMap: Record<string, string> = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
  };

  res.json({
    id: String(memberId),
    firstName: clan.IME,
    lastName: clan.PRIIMEK,
    email: clan.EMAIL,
    tier: tierEn(tierRows[0]?.KODA ?? 'OSNOVNI'),
    points,
    cardNumber: cardRows[0]?.STEVILKA_KARTICE ?? '',
    cardStatus: cardStatusMap[cardRows[0]?.STATUS_POSILJANJA] ?? 'pending',
    address: clan.NASLOV,
    registrationDate: clan.DATUM_REGISTRACIJE,
  });
});

router.delete('/me/account', async (req, res) => {
  const memberId = req.user!.memberId!;
  const accountId = req.user!.accountId;

  const rows = await query<{ AKTIVEN: string; IME: string; PRIIMEK: string; EMAIL: string }>(
    `SELECT AKTIVEN, IME, PRIIMEK, EMAIL FROM CLAN WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  if (!rows.length) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  if (rows[0].AKTIVEN !== 'Y') {
    res.status(200).json({ success: true, message: 'Account already deleted' });
    return;
  }

  const memberData = rows[0];

  await withTransaction(async (conn) => {
    // Log deletion to audit trail BEFORE removing the user
    const auditIdResult = await conn.execute<{ ID: number }>(
      `SELECT seq_revizija.NEXTVAL AS ID FROM DUAL`,
      {},
      { autoCommit: false }
    );
    const auditId = Number((auditIdResult.rows as { ID: number }[])[0].ID);

    await conn.execute(
      `INSERT INTO REVIZIJSKI_DNEVNIK (ID, CAS_DOGODKA, ID_RACUNA, TIP_DOGODKA, ENTITETA, ID_ENTITETE, PODROBNOSTI, IP_NASLOV)
       VALUES (:auditId, SYSTIMESTAMP, NULL, :eventType, :entity, :entityId, :details, :ip)`,
      {
        auditId,
        eventType: 'ACCOUNT_DELETED',
        entity: 'CLAN',
        entityId: memberId,
        details: `User deleted: ${memberData.IME} ${memberData.PRIIMEK} (${memberData.EMAIL})`,
        ip: req.ip || 'unknown',
      },
      { autoCommit: false }
    );

    // Correct deletion order to avoid FK constraints:
    // EMAIL_VERIFIKACIJA, REVIZIJSKI_DNEVNIK, PONASTAVITEV_GESLA, UPORABNISK_RACUN, STATUS_CLANA, KARTICA_LOJALNOSTI, CLAN

    // Delete email verification records (depends on UPORABNISK_RACUN)
    await conn.execute(
      `DELETE FROM EMAIL_VERIFIKACIJA WHERE ID_RACUNA = :accountId`,
      { accountId },
      { autoCommit: false }
    );

    // Delete audit trail for this account
    await conn.execute(
      `DELETE FROM REVIZIJSKI_DNEVNIK WHERE ID_RACUNA = :accountId`,
      { accountId },
      { autoCommit: false }
    );

    // Delete password reset records (depends on UPORABNISK_RACUN)
    await conn.execute(
      `DELETE FROM PONASTAVITEV_GESLA WHERE ID_RACUNA = :accountId`,
      { accountId },
      { autoCommit: false }
    );

    // Delete user account
    await conn.execute(
      `DELETE FROM UPORABNISK_RACUN WHERE ID_RACUNA = :accountId`,
      { accountId },
      { autoCommit: false }
    );

    // Delete status history (depends on CLAN)
    await conn.execute(
      `DELETE FROM STATUS_CLANA WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );

    // Delete loyalty cards (depends on CLAN)
    await conn.execute(
      `DELETE FROM KARTICA_LOJALNOSTI WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );

    // Delete member profile (parent table - all children already deleted)
    await conn.execute(
      `DELETE FROM CLAN WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );
  });

  res.status(200).json({ success: true, message: 'Account deleted successfully' });
});

router.get('/notifications', async (req, res) => {
  const memberId = req.user!.memberId!;
  const lang = (req.query.lang as string) === 'sl' ? 'sl' : 'en';
  const rows = await query<{
    ID_OBVESTILA: number;
    TIP: string;
    VSEBINA_SL: string;
    VSEBINA_EN: string;
    DATUM_POSLANJA: Date;
  }>(
    `SELECT ID_OBVESTILA, TIP, VSEBINA_SL, VSEBINA_EN, DATUM_POSLANJA
     FROM OBVESTILO WHERE ID_CLANA = :memberId ORDER BY DATUM_POSLANJA DESC`,
    { memberId }
  );
  res.json(
    rows.map((r) => ({
      id: String(r.ID_OBVESTILA),
      type: r.TIP,
      content: lang === 'sl' ? r.VSEBINA_SL : r.VSEBINA_EN,
      date: r.DATUM_POSLANJA,
    }))
  );
});

export default router;

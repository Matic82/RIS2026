import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import oracledb from 'oracledb';
import { query, withTransaction, execute } from '../db.js';
import { processMemberBilling } from './loyaltyEngine.js';
import { logAudit, type AuditContext } from './auditService.js';
import { TIER_LABELS, type TierCode } from '../config.js';

export const ROBERT_BRODNIK_EMAIL = 'robertogianfranco66@gmail.com';

export type ErpRow = {
  memberEmail: string;
  amount: number;
  month: number;
  year: number;
};

export type ErpImportResult = {
  timestamp: string;
  recordsProcessed: number;
  errors: string[];
  status: 'success' | 'partial' | 'failed' | 'idle' | 'reverted';
  sourceFile?: string;
  revertedPeriods?: string[];
};

let lastImportResult: ErpImportResult = {
  timestamp: '',
  recordsProcessed: 0,
  errors: [],
  status: 'idle',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

export const DEFAULT_ERP_IMPORT_PATH = path.resolve(projectRoot, 'data/erp-import-example.json');
export const APRIL_DEMO_IMPORT_PATH = path.resolve(projectRoot, 'data/erp-april-2026.json');

export function resolveImportPath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(projectRoot, filePath);
}

export function getLastImportResult(): ErpImportResult {
  return lastImportResult;
}

function uniquePeriodsFromRows(rows: ErpRow[]): Array<{ month: number; year: number }> {
  const map = new Map<string, { month: number; year: number }>();
  for (const row of rows) {
    map.set(`${row.month}-${row.year}`, { month: row.month, year: row.year });
  }
  return Array.from(map.values());
}

export async function periodHasImportData(month: number, year: number): Promise<boolean> {
  const rows = await query<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT
     FROM NAKUP n
     JOIN OBRACUNSKO_OBDOBJE o ON o.ID_OBDOBJA = n.ID_OBDOBJA
     WHERE o.MESEC = :month AND o.LETO = :year`,
    { month, year }
  );
  return Number(rows[0]?.CNT ?? 0) > 0;
}

function tierDisplay(code: TierCode | string | null | undefined): string {
  if (!code) return '-';
  return TIER_LABELS[code as TierCode]?.en ?? String(code);
}

type RevertSnapshot = {
  memberId: number;
  memberName: string;
  tierFrom: string | null;
  tierTo: string | null;
  pointsRemoved: number;
};

async function captureRevertSnapshot(periodId: number): Promise<RevertSnapshot[]> {
  const statusRows = await query<{
    ID_CLANA: number;
    IME: string;
    PRIIMEK: string;
    KODA: TierCode;
    PREV_KODA: TierCode | null;
  }>(
    `SELECT s.ID_CLANA, c.IME, c.PRIIMEK, n.KODA,
            (SELECT n2.KODA
             FROM STATUS_CLANA s2
             JOIN NIVO_LOJALNOSTI n2 ON n2.ID_NIVOJA = s2.ID_NIVOJA
             WHERE s2.ID_CLANA = s.ID_CLANA AND s2.TRENUTNI = 'N'
             ORDER BY s2.DATUM_OD DESC
             FETCH FIRST 1 ROW ONLY) AS PREV_KODA
     FROM STATUS_CLANA s
     JOIN CLAN c ON c.ID_CLANA = s.ID_CLANA
     JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_OBDOBJA = :periodId`,
    { periodId }
  );

  const pointsRows = await query<{ ID_CLANA: number; POINTS: number }>(
    `SELECT ID_CLANA, NVL(SUM(STEVILO_TOCK), 0) AS POINTS
     FROM TOCKE_TRANSAKCIJA
     WHERE ID_OBDOBJA = :periodId
     GROUP BY ID_CLANA`,
    { periodId }
  );

  const purchaseMembers = await query<{ ID_CLANA: number; IME: string; PRIIMEK: string }>(
    `SELECT DISTINCT c.ID_CLANA, c.IME, c.PRIIMEK
     FROM NAKUP n
     JOIN CLAN c ON c.ID_CLANA = n.ID_CLANA
     WHERE n.ID_OBDOBJA = :periodId`,
    { periodId }
  );

  const snapshotMap = new Map<number, RevertSnapshot>();

  for (const row of purchaseMembers) {
    snapshotMap.set(row.ID_CLANA, {
      memberId: row.ID_CLANA,
      memberName: `${row.IME} ${row.PRIIMEK} (ID: ${row.ID_CLANA})`,
      tierFrom: null,
      tierTo: null,
      pointsRemoved: 0,
    });
  }

  for (const row of statusRows) {
    const existing = snapshotMap.get(row.ID_CLANA) ?? {
      memberId: row.ID_CLANA,
      memberName: `${row.IME} ${row.PRIIMEK} (ID: ${row.ID_CLANA})`,
      tierFrom: null,
      tierTo: null,
      pointsRemoved: 0,
    };
    existing.tierFrom = tierDisplay(row.KODA);
    existing.tierTo = tierDisplay(row.PREV_KODA);
    snapshotMap.set(row.ID_CLANA, existing);
  }

  for (const row of pointsRows) {
    const existing = snapshotMap.get(row.ID_CLANA);
    if (existing) {
      existing.pointsRemoved = Number(row.POINTS);
    }
  }

  return Array.from(snapshotMap.values());
}

async function logRevertAudit(
  snapshots: RevertSnapshot[],
  periodLabel: string,
  audit?: AuditContext
): Promise<void> {
  if (!audit) return;

  for (const snap of snapshots) {
    if (snap.tierFrom && snap.tierTo && snap.tierFrom !== snap.tierTo) {
      await logAudit({
        accountId: audit.accountId,
        eventType: 'STATUS_CHANGE',
        entity: 'CLAN',
        entityId: snap.memberId,
        details: {
          descriptionKey: 'admin.audit.desc.tierRevertedErp',
          description: `Tier restored after reverting ERP import for ${periodLabel}`,
          affectedMember: snap.memberName,
          oldValue: snap.tierFrom,
          newValue: snap.tierTo,
          performedBy: 'system',
        },
        ip: audit.ip,
      });
    }

    if (snap.pointsRemoved > 0) {
      await logAudit({
        accountId: audit.accountId,
        eventType: 'POINTS_AWARDED',
        entity: 'CLAN',
        entityId: snap.memberId,
        details: {
          descriptionKey: 'admin.audit.desc.pointsRevertedErp',
          description: `Points removed after reverting ERP import for ${periodLabel}`,
          affectedMember: snap.memberName,
          oldValue: `${snap.pointsRemoved} points`,
          newValue: '-',
          performedBy: 'system',
        },
        ip: audit.ip,
      });
    }
  }
}

async function restorePreviousTiers(
  conn: oracledb.Connection,
  memberIds: number[]
): Promise<void> {
  for (const memberId of memberIds) {
    const prevStatus = await conn.execute<{ ID_STATUSA: number; KODA: string }>(
      `SELECT s.ID_STATUSA, n.KODA
       FROM STATUS_CLANA s
       JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
       WHERE s.ID_CLANA = :memberId AND s.TRENUTNI = 'N'
       ORDER BY s.DATUM_OD DESC
       FETCH FIRST 1 ROW ONLY`,
      { memberId },
      { autoCommit: false }
    );
    const prev = (prevStatus.rows as { ID_STATUSA: number; KODA: string }[])?.[0];
    if (!prev) continue;

    await conn.execute(
      `UPDATE STATUS_CLANA SET TRENUTNI = 'Y', DATUM_DO = NULL WHERE ID_STATUSA = :statusId`,
      { statusId: prev.ID_STATUSA },
      { autoCommit: false }
    );
  }
}

export async function revertBillingPeriod(
  month: number,
  year: number,
  audit?: AuditContext
): Promise<boolean> {
  const rows = await query<{ ID_OBDOBJA: number }>(
    `SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = :month AND LETO = :year`,
    { month, year }
  );
  const periodId = rows[0]?.ID_OBDOBJA;
  if (!periodId) return false;

  const periodLabel = `${month}/${year}`;
  const snapshots = audit ? await captureRevertSnapshot(periodId) : [];

  await withTransaction(async (conn) => {
    const affectedMembers = await conn.execute<{ ID_CLANA: number }>(
      `SELECT DISTINCT ID_CLANA FROM STATUS_CLANA WHERE ID_OBDOBJA = :periodId`,
      { periodId },
      { autoCommit: false }
    );
    const memberIds = (affectedMembers.rows as { ID_CLANA: number }[]).map((r) => r.ID_CLANA);

    await conn.execute(
      `DELETE FROM TOCKE_TRANSAKCIJA WHERE ID_OBDOBJA = :periodId`,
      { periodId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM NAKUP WHERE ID_OBDOBJA = :periodId`,
      { periodId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM STATUS_CLANA WHERE ID_OBDOBJA = :periodId`,
      { periodId },
      { autoCommit: false }
    );

    await restorePreviousTiers(conn, memberIds);

    await conn.execute(
      `DELETE FROM OBRACUNSKO_OBDOBJE WHERE ID_OBDOBJA = :periodId`,
      { periodId },
      { autoCommit: false }
    );
  });

  await logRevertAudit(snapshots, periodLabel, audit);

  return true;
}

async function recordImportOnPeriod(
  periodId: number,
  result: Omit<ErpImportResult, 'sourceFile' | 'revertedPeriods'>
): Promise<void> {
  const errorsText =
    result.errors.length > 0 ? result.errors.join('; ').slice(0, 3900) : null;

  await query(
    `UPDATE OBRACUNSKO_OBDOBJE
     SET DATUM_UVOZA = SYSTIMESTAMP,
         STATUS_UVOZA = :status,
         STEVILO_UVOZENIH = :recordsProcessed,
         NAPAKE_UVOZA = :errors
     WHERE ID_OBDOBJA = :periodId`,
    {
      periodId,
      status: 'CLOSED',
      recordsProcessed: result.recordsProcessed,
      errors: errorsText,
    }
  );
}

export async function runErpImport(
  filePath: string = DEFAULT_ERP_IMPORT_PATH,
  options: { toggle?: boolean; clearExisting?: boolean; audit?: AuditContext } = {}
): Promise<ErpImportResult> {
  const { toggle = false, clearExisting = false, audit } = options;
  const abs = resolveImportPath(filePath);

  if (!fs.existsSync(abs)) {
    const failed: ErpImportResult = {
      timestamp: new Date().toISOString(),
      recordsProcessed: 0,
      errors: [`Import file not found: ${abs}`],
      status: 'failed',
      sourceFile: abs,
    };
    lastImportResult = failed;
    return failed;
  }

  const rows: ErpRow[] = JSON.parse(fs.readFileSync(abs, 'utf-8'));
  const periods = uniquePeriodsFromRows(rows);

  if (toggle && periods.length > 0) {
    const periodChecks = await Promise.all(
      periods.map((p) => periodHasImportData(p.month, p.year))
    );
    if (periodChecks.every(Boolean)) {
      const revertedPeriods: string[] = [];
      for (const p of periods) {
        const ok = await revertBillingPeriod(p.month, p.year, audit);
        if (ok) revertedPeriods.push(`${p.month}/${p.year}`);
      }

      if (audit && revertedPeriods.length > 0) {
        await logAudit({
          accountId: audit.accountId,
          eventType: 'ERP_IMPORT_REVERTED',
          entity: 'OBRACUNSKO_OBDOBJE',
          details: {
            descriptionKey: 'admin.audit.desc.erpImportReverted',
            description: `Reverted ERP import for ${revertedPeriods.join(', ')}`,
            affectedMember: 'allMembers',
            oldValue: revertedPeriods.join(', '),
            newValue: '-',
          },
          ip: audit.ip,
        });
      }

      const result: ErpImportResult = {
        timestamp: new Date().toISOString(),
        recordsProcessed: 0,
        errors: [],
        status: 'reverted',
        sourceFile: abs,
        revertedPeriods,
      };
      lastImportResult = result;
      return result;
    }
  }

  const errors: string[] = [];
  let imported = 0;
  let lastPeriodId: number | null = null;
  const periodIdsProcessed = new Set<number>();

  if (clearExisting) {
    for (const p of periods) {
      try {
        const exists = await periodHasImportData(p.month, p.year);
        if (exists) {
          await revertBillingPeriod(p.month, p.year, audit);
        }
      } catch (e) {
        errors.push(
          `Failed clearing period ${p.month}/${p.year}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  for (const row of rows) {
    try {
      const members = await query<{ ID_CLANA: number }>(
        `SELECT ID_CLANA FROM CLAN WHERE LOWER(EMAIL) = :email AND AKTIVEN = 'Y'`,
        { email: row.memberEmail.toLowerCase() }
      );
      if (!members.length) {
        errors.push(`Unknown member: ${row.memberEmail}`);
        continue;
      }

      await withTransaction(async (conn) => {
        let periodRows = await conn.execute<{ ID_OBDOBJA: number }>(
          `SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = :month AND LETO = :year`,
          { month: row.month, year: row.year },
          { autoCommit: false }
        );
        let periodId = (periodRows.rows as { ID_OBDOBJA: number }[])?.[0]?.ID_OBDOBJA;

        if (!periodId) {
          const newP = await conn.execute<{ ID: number }>(
            `SELECT seq_obdobje.NEXTVAL AS ID FROM DUAL`
          );
          periodId = Number((newP.rows as { ID: number }[])[0].ID);
          await conn.execute(
            `INSERT INTO OBRACUNSKO_OBDOBJE (ID_OBDOBJA, MESEC, LETO, STATUS_UVOZA)
             VALUES (:id, :month, :year, 'PROCESSING')`,
            { id: periodId, month: row.month, year: row.year },
            { autoCommit: false }
          );
        }

        lastPeriodId = periodId;
        periodIdsProcessed.add(periodId);

        const existing = await conn.execute(
          `SELECT ID_NAKUPA FROM NAKUP WHERE ID_CLANA = :memberId AND ID_OBDOBJA = :periodId`,
          { memberId: members[0].ID_CLANA, periodId },
          { autoCommit: false }
        );
        if ((existing.rows as unknown[])?.length) {
          await conn.execute(
            `UPDATE NAKUP SET ZNESEK = :amount, DATUM_UVOZA = SYSTIMESTAMP
             WHERE ID_CLANA = :memberId AND ID_OBDOBJA = :periodId`,
            { amount: row.amount, memberId: members[0].ID_CLANA, periodId },
            { autoCommit: false }
          );
        } else {
          await conn.execute(
            `INSERT INTO NAKUP (ID_NAKUPA, ID_CLANA, ID_OBDOBJA, ZNESEK)
             VALUES (seq_nakup.NEXTVAL, :memberId, :periodId, :amount)`,
            { memberId: members[0].ID_CLANA, periodId, amount: row.amount },
            { autoCommit: false }
          );
        }
      });
      imported++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${row.memberEmail}: ${msg}`);
    }
  }

  const status: ErpImportResult['status'] =
    imported === 0 && rows.length > 0
      ? 'failed'
      : errors.length > 0
        ? 'partial'
        : 'success';

  const result: ErpImportResult = {
    timestamp: new Date().toISOString(),
    recordsProcessed: imported,
    errors,
    status,
    sourceFile: abs,
  };

  if (lastPeriodId) {
    await recordImportOnPeriod(lastPeriodId, result);
  }

  if (audit && imported > 0) {
    const periodLabels = periods.map((p) => `${p.month}/${p.year}`).join(', ');
    await logAudit({
      accountId: audit.accountId,
      eventType: 'ERP_IMPORT',
      entity: 'OBRACUNSKO_OBDOBJE',
      entityId: lastPeriodId ?? undefined,
      details: {
        descriptionKey: 'admin.audit.desc.erpImportApril',
        description: `Imported purchase data from ERP for ${periodLabels}`,
        affectedMember: 'allMembers',
        oldValue: '-',
        newValue: `${imported} records`,
      },
      ip: audit.ip,
    });
  }

  for (const pid of Array.from(periodIdsProcessed)) {
    try {
      const periodInfo = await query<{ MESEC: number; LETO: number }>(
        `SELECT MESEC, LETO FROM OBRACUNSKO_OBDOBJE WHERE ID_OBDOBJA = :periodId`,
        { periodId: pid }
      );
      const periodLabel = periodInfo[0]
        ? `${periodInfo[0].MESEC}/${periodInfo[0].LETO}`
        : String(pid);

      const purchases = await query<{ ID_CLANA: number; ZNESEK: number }>(
        `SELECT ID_CLANA, ZNESEK FROM NAKUP WHERE ID_OBDOBJA = :periodId`,
        { periodId: pid }
      );
      for (const p of purchases) {
        try {
          await processMemberBilling(p.ID_CLANA, pid, Number(p.ZNESEK), {
            ...audit,
            source: 'ERP_IMPORT',
            periodLabel,
          });
        } catch (e) {
          errors.push(
            `Billing member ${p.ID_CLANA} in period ${pid}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
      await execute(
        `UPDATE OBRACUNSKO_OBDOBJE SET STATUS_UVOZA = 'CLOSED', DATUM_UVOZA = SYSTIMESTAMP WHERE ID_OBDOBJA = :periodId`,
        { periodId: pid }
      );
    } catch (e) {
      errors.push(
        `Failed running billing for period ${pid}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  if (errors.length > 0 && imported > 0) {
    result.status = 'partial';
    result.errors = errors;
  }

  lastImportResult = result;
  return result;
}

export async function getImportStatusFromDb(): Promise<ErpImportResult | null> {
  const rows = await query<{
    DATUM_UVOZA: Date | null;
    STATUS_UVOZA: string;
    STEVILO_UVOZENIH: number | null;
    NAPAKE_UVOZA: string | null;
  }>(
    `SELECT DATUM_UVOZA, STATUS_UVOZA, STEVILO_UVOZENIH, NAPAKE_UVOZA
     FROM OBRACUNSKO_OBDOBJE
     WHERE DATUM_UVOZA IS NOT NULL
     ORDER BY DATUM_UVOZA DESC
     FETCH FIRST 1 ROW ONLY`
  );

  if (!rows.length) {
    return lastImportResult.status !== 'idle' ? lastImportResult : null;
  }

  const r = rows[0];
  const importedAt = r.DATUM_UVOZA;
  if (!importedAt) {
    return lastImportResult.status !== 'idle' ? lastImportResult : null;
  }

  const dbStatus: ErpImportResult['status'] = r.NAPAKE_UVOZA
    ? Number(r.STEVILO_UVOZENIH ?? 0) === 0
      ? 'failed'
      : 'partial'
    : 'success';

  return {
    timestamp: importedAt.toISOString(),
    recordsProcessed: Number(r.STEVILO_UVOZENIH ?? 0),
    errors: r.NAPAKE_UVOZA ? r.NAPAKE_UVOZA.split('; ') : [],
    status: dbStatus,
  };
}

import oracledb from 'oracledb';
import { query, withTransaction } from '../db.js';
import type { TierCode } from '../config.js';
import { TIER_LABELS } from '../config.js';
import { logAudit, type AuditContext } from './auditService.js';

type StatusRule = {
  TIP_PRAVILA: string;
  PRAG_ZNESEK: number;
  STEVILO_MESECEV: number;
};

type TierRow = { ID_NIVOJA: number; KODA: TierCode };

async function loadStatusRules(): Promise<Record<string, StatusRule>> {
  const rows = await query<StatusRule>(
    `SELECT TIP_PRAVILA, PRAG_ZNESEK, STEVILO_MESECEV FROM PRAVILO_STATUSA WHERE AKTIVNO = 'Y'`
  );
  const map: Record<string, StatusRule> = {};
  for (const r of rows) map[r.TIP_PRAVILA] = r;
  return map;
}

async function getTierMap(): Promise<Record<TierCode, number>> {
  const rows = await query<TierRow>(`SELECT ID_NIVOJA, KODA FROM NIVO_LOJALNOSTI`);
  const map = {} as Record<TierCode, number>;
  for (const r of rows) map[r.KODA] = r.ID_NIVOJA;
  return map;
}

async function getCurrentTierCode(memberId: number): Promise<TierCode> {
  const rows = await query<{ KODA: TierCode }>(
    `SELECT n.KODA FROM STATUS_CLANA s
     JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = s.ID_NIVOJA
     WHERE s.ID_CLANA = :memberId AND s.TRENUTNI = 'Y'`,
    { memberId }
  );
  return rows[0]?.KODA ?? 'OSNOVNI';
}

async function countGoldQualifyingPeriods(
  memberId: number,
  threshold: number,
  beforePeriodId: number
): Promise<number> {
  const rows = await query<{ CNT: number }>(
    `SELECT COUNT(DISTINCT n.ID_OBDOBJA) AS CNT
     FROM NAKUP n
     WHERE n.ID_CLANA = :memberId AND n.ZNESEK > :threshold
       AND n.ID_OBDOBJA < :beforePeriodId`,
    { memberId, threshold, beforePeriodId }
  );
  return Number(rows[0]?.CNT ?? 0);
}

async function countConsecutiveLowMonths(
  memberId: number,
  threshold: number,
  periods: number,
  currentPeriodId: number
): Promise<number> {
  const rows = await query<{ ZNESEK: number }>(
    `SELECT NVL(n.ZNESEK, 0) AS ZNESEK
     FROM OBRACUNSKO_OBDOBJE o
     LEFT JOIN NAKUP n ON n.ID_OBDOBJA = o.ID_OBDOBJA AND n.ID_CLANA = :memberId
     WHERE o.ID_OBDOBJA < :currentPeriodId AND o.STATUS_UVOZA = 'CLOSED'
     ORDER BY o.LETO DESC, o.MESEC DESC
     FETCH FIRST :periods ROWS ONLY`,
    { memberId, currentPeriodId, periods }
  );
  let count = 0;
  for (const r of rows) {
    if (Number(r.ZNESEK) < threshold) count++;
    else break;
  }
  return count;
}

async function countConsecutiveHighMonths(
  memberId: number,
  threshold: number,
  periods: number,
  currentPeriodId: number
): Promise<number> {
  const rows = await query<{ ZNESEK: number }>(
    `SELECT NVL(n.ZNESEK, 0) AS ZNESEK
     FROM OBRACUNSKO_OBDOBJE o
     LEFT JOIN NAKUP n ON n.ID_OBDOBJA = o.ID_OBDOBJA AND n.ID_CLANA = :memberId
     WHERE o.ID_OBDOBJA < :currentPeriodId AND o.STATUS_UVOZA = 'CLOSED'
     ORDER BY o.LETO DESC, o.MESEC DESC
     FETCH FIRST :periods ROWS ONLY`,
    { memberId, currentPeriodId, periods }
  );
  let count = 0;
  for (const r of rows) {
    if (Number(r.ZNESEK) >= threshold) count++;
    else break;
  }
  return count;
}

export async function evaluateNewTier(
  memberId: number,
  periodId: number,
  purchaseAmount: number
): Promise<{ newTier: TierCode; reason: string } | null> {
  const rules = await loadStatusRules();
  const current = await getCurrentTierCode(memberId);

  const upgradeSilver = rules.UPGRADE_SILVER?.PRAG_ZNESEK ?? 499;
  const upgradeGold = rules.UPGRADE_GOLD?.PRAG_ZNESEK ?? 500;
  const goldPeriods = rules.UPGRADE_GOLD?.STEVILO_MESECEV ?? 3;
  const maintainSilver = rules.MAINTAIN_SILVER?.PRAG_ZNESEK ?? 200;
  const maintainGold = rules.MAINTAIN_GOLD?.PRAG_ZNESEK ?? 500;
  const downgradeSilverMonths = rules.DOWNGRADE_SILVER?.STEVILO_MESECEV ?? 2;
  const downgradeSilverThreshold = rules.DOWNGRADE_SILVER?.PRAG_ZNESEK ?? 200;
  const recoverBronzeMonths = rules.RECOVER_BRONZE?.STEVILO_MESECEV ?? 2;
  const recoverBronzeThreshold = rules.RECOVER_BRONZE?.PRAG_ZNESEK ?? 200;
  const resetBasicThreshold = rules.RESET_BASIC?.PRAG_ZNESEK ?? 50;

  // Bronze special rules
  if (current === 'BRONASTI') {
    if (purchaseAmount < resetBasicThreshold) {
      return { newTier: 'OSNOVNI', reason: `Nakupi ${purchaseAmount} EUR < ${resetBasicThreshold} EUR` };
    }
    const highStreak =
      (await countConsecutiveHighMonths(
        memberId,
        recoverBronzeThreshold,
        recoverBronzeMonths,
        periodId
      )) +
      (purchaseAmount >= recoverBronzeThreshold ? 1 : 0);
    if (highStreak >= recoverBronzeMonths) {
      return {
        newTier: 'SREBRNI',
        reason: `${recoverBronzeMonths} zaporedna meseca z nakupi >= ${recoverBronzeThreshold} EUR`,
      };
    }
    return null;
  }

  // Gold maintenance / downgrade
  if (current === 'ZLATI') {
    if (purchaseAmount < maintainGold) {
      return {
        newTier: 'SREBRNI',
        reason: `Nakupi ${purchaseAmount} EUR < ${maintainGold} EUR (ohranitev zlatega)`,
      };
    }
    return null;
  }

  // Silver maintenance / downgrade / upgrade to gold
  if (current === 'SREBRNI') {
    const goldPeriodsCount =
      (await countGoldQualifyingPeriods(memberId, upgradeGold, periodId)) +
      (purchaseAmount > upgradeGold ? 1 : 0);
    if (goldPeriodsCount >= goldPeriods) {
      return {
        newTier: 'ZLATI',
        reason: `${goldPeriods} obračunska obdobja z nakupi > ${upgradeGold} EUR`,
      };
    }
    if (purchaseAmount < maintainSilver) {
      const lowStreak =
        (await countConsecutiveLowMonths(
          memberId,
          downgradeSilverThreshold,
          downgradeSilverMonths,
          periodId
        )) + 1;
      if (lowStreak >= downgradeSilverMonths) {
        return {
          newTier: 'BRONASTI',
          reason: `${downgradeSilverMonths} meseca zapored pod ${downgradeSilverThreshold} EUR`,
        };
      }
    }
    return null;
  }

  // Basic -> Silver (first time over threshold)
  if (current === 'OSNOVNI') {
    if (purchaseAmount > upgradeSilver) {
      return {
        newTier: 'SREBRNI',
        reason: `Prvič nakupi > ${upgradeSilver} EUR v obdobju`,
      };
    }
  }

  return null;
}

export async function calculatePoints(
  tierCode: TierCode,
  purchaseAmount: number
): Promise<number> {
  const rows = await query<{ TOCKE: number }>(
    `SELECT pt.TOCKE FROM PRAVILO_TOCKOVANJA pt
     JOIN NIVO_LOJALNOSTI n ON n.ID_NIVOJA = pt.ID_NIVOJA
     WHERE n.KODA = :tierCode AND pt.AKTIVNO = 'Y'
       AND :amount >= pt.ZNESEK_OD
       AND (pt.ZNESEK_DO IS NULL OR :amount <= pt.ZNESEK_DO)
     ORDER BY pt.ZNESEK_OD DESC
     FETCH FIRST 1 ROW ONLY`,
    { tierCode, amount: purchaseAmount }
  );
  return Number(rows[0]?.TOCKE ?? 0);
}

export async function applyStatusChange(
  conn: oracledb.Connection,
  memberId: number,
  periodId: number,
  newTierCode: TierCode,
  reason: string
): Promise<void> {
  const tierRows = await conn.execute<{ ID_NIVOJA: number }>(
    `SELECT ID_NIVOJA FROM NIVO_LOJALNOSTI WHERE KODA = :code`,
    { code: newTierCode }
  );
  const tierId = (tierRows.rows as { ID_NIVOJA: number }[])?.[0]?.ID_NIVOJA;
  if (!tierId) throw new Error(`Unknown tier ${newTierCode}`);

  await conn.execute(
    `UPDATE STATUS_CLANA SET TRENUTNI = 'N', DATUM_DO = SYSTIMESTAMP
     WHERE ID_CLANA = :memberId AND TRENUTNI = 'Y'`,
    { memberId },
    { autoCommit: false }
  );

  await conn.execute(
    `INSERT INTO STATUS_CLANA (ID_STATUSA, ID_CLANA, ID_NIVOJA, ID_OBDOBJA, RAZLOG_SPREMEMBE, TRENUTNI)
     VALUES (seq_status.NEXTVAL, :memberId, :tierId, :periodId, :reason, 'Y')`,
    { memberId, tierId, periodId, reason },
    { autoCommit: false }
  );
}

async function getMemberDisplayName(memberId: number): Promise<string> {
  const rows = await query<{ IME: string; PRIIMEK: string; ID_CLANA: number }>(
    `SELECT ID_CLANA, IME, PRIIMEK FROM CLAN WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  const member = rows[0];
  return member ? `${member.IME} ${member.PRIIMEK} (ID: ${member.ID_CLANA})` : `Member ${memberId}`;
}

function tierDisplay(code: TierCode): string {
  return TIER_LABELS[code]?.en ?? code;
}

export async function processMemberBilling(
  memberId: number,
  periodId: number,
  purchaseAmount: number,
  audit?: AuditContext
): Promise<{ tierChanged: boolean; pointsAwarded: number; newTier: TierCode; previousTier: TierCode }> {
  const tierBefore = await getCurrentTierCode(memberId);
  const memberName = audit ? await getMemberDisplayName(memberId) : '';

  const result = await withTransaction(async (conn) => {
    const evaluation = await evaluateNewTier(memberId, periodId, purchaseAmount);
    let tierAfter = tierBefore;

    if (evaluation) {
      await applyStatusChange(
        conn,
        memberId,
        periodId,
        evaluation.newTier,
        evaluation.reason
      );
      tierAfter = evaluation.newTier;

      await conn.execute(
        `INSERT INTO OBVESTILO (ID_OBVESTILA, ID_CLANA, TIP, VSEBINA_SL, VSEBINA_EN, STATUS)
         VALUES (seq_obvestilo.NEXTVAL, :memberId, 'STATUS_CHANGE',
           :bodySl, :bodyEn, 'SENT')`,
        {
          memberId,
          bodySl: `Vaš status je bil posodobljen na ${evaluation.newTier}. Razlog: ${evaluation.reason}`,
          bodyEn: `Your status was updated to ${evaluation.newTier}. Reason: ${evaluation.reason}`,
        },
        { autoCommit: false }
      );
    }

    const points = await calculatePoints(tierAfter, purchaseAmount);
    if (points > 0) {
      await conn.execute(
        `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, ID_OBDOBJA, STEVILO_TOCK, TIP, OPIS)
         VALUES (seq_tocke.NEXTVAL, :memberId, :periodId, :points, 'EARNED',
           :opis)`,
        {
          memberId,
          periodId,
          points,
          opis: `Mesečni obračun - ${purchaseAmount} EUR nakupov`,
        },
        { autoCommit: false }
      );
    }

    return {
      tierChanged: !!evaluation,
      pointsAwarded: points,
      newTier: tierAfter,
      previousTier: tierBefore,
      evaluation,
    };
  });

  if (audit && result.tierChanged && result.evaluation) {
    await logAudit({
      accountId: audit.accountId,
      eventType: 'STATUS_CHANGE',
      entity: 'CLAN',
      entityId: memberId,
      details: {
        descriptionKey: 'admin.audit.desc.tierChangeErp',
        description: `Tier changed after ERP import for ${audit.periodLabel ?? 'billing period'}`,
        affectedMember: memberName,
        oldValue: tierDisplay(result.previousTier),
        newValue: tierDisplay(result.newTier),
        performedBy: 'system',
      },
      ip: audit.ip,
    });
  }

  if (audit && result.pointsAwarded > 0) {
    await logAudit({
      accountId: audit.accountId,
      eventType: 'POINTS_AWARDED',
      entity: 'CLAN',
      entityId: memberId,
      details: {
        descriptionKey: 'admin.audit.desc.pointsAwardedErp',
        description: `Points awarded after ERP import for ${audit.periodLabel ?? 'billing period'}`,
        affectedMember: memberName,
        oldValue: '-',
        newValue: `+${result.pointsAwarded} points`,
        performedBy: 'system',
      },
      ip: audit.ip,
    });
  }

  return {
    tierChanged: result.tierChanged,
    pointsAwarded: result.pointsAwarded,
    newTier: result.newTier,
    previousTier: result.previousTier,
  };
}

export async function getMemberPointsBalance(memberId: number): Promise<number> {
  const rows = await query<{ BALANCE: number }>(
    `SELECT NVL(SUM(STEVILO_TOCK), 0) AS BALANCE FROM TOCKE_TRANSAKCIJA WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  return Number(rows[0]?.BALANCE ?? 0);
}

/**
 * Automated monthly billing script - can be run by cronjob
 * 
 * This script processes billing for the current month automatically.
 * No command-line arguments needed - perfect for cronjobs.
 * 
 * Usage:
 *   npm run job:billing-auto
 * 
 * Cronjob setup (Linux/macOS):
 *   # Run on the 1st of each month at 2 AM
 *   0 2 1 * * cd /path/to/maestro/server && npm run job:billing-auto
 * 
 * Environment: Can be configured via .env
 *   - BILLING_RUN_PREVIOUS_MONTH=true (default false) - runs previous month instead of current
 */

import { initDb, closeDb, query, execute } from '../db.js';
import { processMemberBilling } from '../services/loyaltyEngine.js';

async function main() {
  const now = new Date();
  let month = now.getMonth() + 1; // 1-12
  let year = now.getFullYear();

  // If env var is set, run for previous month instead
  const runPreviousMonth = process.env.BILLING_RUN_PREVIOUS_MONTH === 'true';
  if (runPreviousMonth) {
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }

  console.log(`Starting automated billing for ${month}/${year}...`);

  await initDb();

  let periodRows = await query<{ ID_OBDOBJA: number }>(
    `SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = :month AND LETO = :year`,
    { month, year }
  );

  let periodId = periodRows[0]?.ID_OBDOBJA;
  if (!periodId) {
    await execute(
      `INSERT INTO OBRACUNSKO_OBDOBJE (ID_OBDOBJA, MESEC, LETO, STATUS_UVOZA, DATUM_UVOZA)
       VALUES (seq_obdobje.NEXTVAL, :month, :year, 'PROCESSING', SYSTIMESTAMP)`,
      { month, year }
    );
    periodRows = await query(
      `SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = :month AND LETO = :year`,
      { month, year }
    );
    periodId = periodRows[0].ID_OBDOBJA;
  }

  await execute(
    `UPDATE OBRACUNSKO_OBDOBJE SET STATUS_UVOZA = 'PROCESSING' WHERE ID_OBDOBJA = :periodId`,
    { periodId }
  );

  const purchases = await query<{ ID_CLANA: number; ZNESEK: number }>(
    `SELECT ID_CLANA, ZNESEK FROM NAKUP WHERE ID_OBDOBJA = :periodId`,
    { periodId }
  );

  console.log(`Processing billing for ${month}/${year} - ${purchases.length} purchases\n`);

  let processed = 0;
  let tierChanges = 0;
  let totalPointsAwarded = 0;

  for (const p of purchases) {
    const result = await processMemberBilling(
      p.ID_CLANA,
      periodId!,
      Number(p.ZNESEK)
    );
    if (result.tierChanged) {
      tierChanges++;
    }
    totalPointsAwarded += result.pointsAwarded;
    console.log(
      `  Member ${p.ID_CLANA}: tier=${result.newTier}, points=${result.pointsAwarded}, changed=${result.tierChanged}`
    );
    processed++;
  }

  await execute(
    `UPDATE OBRACUNSKO_OBDOBJE SET STATUS_UVOZA = 'CLOSED', DATUM_UVOZA = SYSTIMESTAMP WHERE ID_OBDOBJA = :periodId`,
    { periodId }
  );

  console.log(`\n✓ Billing complete:`);
  console.log(`  - Processed ${processed} members`);
  console.log(`  - Tier changes: ${tierChanges}`);
  console.log(`  - Total points awarded: ${totalPointsAwarded}`);

  await closeDb();
}

main().catch((e) => {
  console.error('Billing error:', e);
  process.exit(1);
});

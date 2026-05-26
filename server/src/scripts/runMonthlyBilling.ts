/**
 * Monthly billing and points calculation script
 * 
 * This script:
 * - Processes all purchases for a given month/year
 * - Evaluates member tier status transitions
 * - Calculates and awards loyalty points based on the Points Calculation Table
 * - Updates member status if needed (e.g., Basic → Silver, Silver → Gold, Silver → Bronze)
 * 
 * Usage:
 *   npm run job:monthly -- <month> <year>
 *   Example: npm run job:monthly -- 5 2026
 * 
 * Root directory: npm run job:monthly -- 4 2026
 * 
 * To set up a cronjob (Linux/macOS):
 *   # Run billing on the 1st of each month at 2 AM
 *   0 2 1 * * cd /path/to/maestro && npm run job:monthly -- $(date +'%m') $(date +'%Y')
 * 
 * Windows Task Scheduler:
 *   - Create task to run: npm run job:monthly -- %month% %year%
 *   - Use batch file with: @echo off && npm run job:monthly -- 4 2026
 * 
 * Demo members to test:
 *   - Ana Novak (ID 1, Silver): Jan 350€ → 15 points, Feb 520€ → 15 points
 *   - Marko Kovač (ID 2, Bronze): Jan 180€ → 0 points, Feb 250€ → 5 points
 *   - Luka Petrov (ID 3, Basic): Jan 150€ → 5 points, Feb 320€ → 10 points
 */

import { initDb, closeDb, query, execute } from '../db.js';
import { processMemberBilling } from '../services/loyaltyEngine.js';

async function main() {
  const month = parseInt(process.argv[2] || '', 10);
  const year = parseInt(process.argv[3] || '', 10);

  if (!month || !year) {
    console.error('Usage: npm run job:monthly -- <month> <year>');
    console.error('Example: npm run job:monthly -- 4 2026');
    process.exit(1);
  }

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

  console.log(`Running billing for ${month}/${year} - ${purchases.length} purchases`);

  let processed = 0;
  for (const p of purchases) {
    const result = await processMemberBilling(
      p.ID_CLANA,
      periodId!,
      Number(p.ZNESEK)
    );
    console.log(
      `  Member ${p.ID_CLANA}: tier=${result.newTier}, points=${result.pointsAwarded}, changed=${result.tierChanged}`
    );
    processed++;
  }

  await execute(
    `UPDATE OBRACUNSKO_OBDOBJE SET STATUS_UVOZA = 'CLOSED', DATUM_UVOZA = SYSTIMESTAMP WHERE ID_OBDOBJA = :periodId`,
    { periodId }
  );

  console.log(`Billing complete. Processed ${processed} members.`);
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

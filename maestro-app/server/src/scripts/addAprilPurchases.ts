/**
 * Add April 2026 purchases for testing billing simulation
 * 
 * Ana Novak: 550€ (Silver → Gold)
 * Robert Brodnik: 500€ (Basic → Silver)
 * Marko Kovač: 0€ (no purchase)
 */

import { initDb, closeDb, withTransaction } from '../db.js';
import { ROBERT_BRODNIK_EMAIL } from '../services/erpImportService.js';

async function main() {
  await initDb();

  console.log('Adding April 2026 purchases...\n');

  await withTransaction(async (conn) => {
    // Get or create April period
    let periodRows = await conn.execute<{ ID_OBDOBJA: number }>(
      `SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = 4 AND LETO = 2026`,
      {},
      { autoCommit: false }
    );

    let periodId = (periodRows.rows as { ID_OBDOBJA: number }[])?.[0]?.ID_OBDOBJA;

    if (!periodId) {
      const newPeriod = await conn.execute<{ ID: number }>(
        `SELECT seq_obdobje.NEXTVAL AS ID FROM DUAL`
      );
      periodId = Number((newPeriod.rows as { ID: number }[])[0].ID);
      await conn.execute(
        `INSERT INTO OBRACUNSKO_OBDOBJE (ID_OBDOBJA, MESEC, LETO, STATUS_UVOZA)
         VALUES (:id, 4, 2026, 'CLOSED')`,
        { id: periodId },
        { autoCommit: false }
      );
      console.log(`✓ Created April 2026 period (ID: ${periodId})`);
    }

    // Ana Novak (ID 1): 550€ - Silver → Gold
    await conn.execute(
      `INSERT INTO NAKUP (ID_NAKUPA, ID_CLANA, ID_OBDOBJA, ZNESEK)
       VALUES (seq_nakup.NEXTVAL, 1, :periodId, 550)`,
      { periodId },
      { autoCommit: false }
    );
    console.log('✓ Ana Novak (ID 1): 550€ - will upgrade to Gold');

    // Robert Brodnik: 500€ - Basic → Silver
    await conn.execute(
      `INSERT INTO NAKUP (ID_NAKUPA, ID_CLANA, ID_OBDOBJA, ZNESEK)
       SELECT seq_nakup.NEXTVAL, c.ID_CLANA, :periodId, 500
       FROM CLAN c WHERE LOWER(c.EMAIL) = :email`,
      { email: ROBERT_BRODNIK_EMAIL.toLowerCase(), periodId },
      { autoCommit: false }
    );
    console.log('✓ Robert Brodnik: 500€ - will upgrade to Silver');

    // Marko Kovač (ID 2): 0€ (no purchase)
    console.log('✓ Marko Kovač (ID 2): 0€ (no purchase)');

    console.log('\n✓ April purchases ready!\n');
    console.log('Now run: npm run job:monthly -- 4 2026\n');
  });

  await closeDb();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});

/**
 * Add missing demo members and their purchases to existing database
 * 
 * This script adds Marko Kovač and Luka Petrov with their purchases
 * if they don't already exist in the database.
 */

import bcrypt from 'bcryptjs';
import { initDb, closeDb, withTransaction, query, execute } from '../db.js';
import { ROBERT_BRODNIK_EMAIL } from '../services/erpImportService.js';

async function createMember(
  conn: Awaited<ReturnType<typeof import('../db.js').getConnection>>,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    address: string;
    tierCode: string;
    verified: boolean;
  }
): Promise<number> {
  const idRows = await conn.execute<{ ID: number }>(
    `SELECT seq_clan.NEXTVAL AS ID FROM DUAL`
  );
  const memberId = Number((idRows.rows as { ID: number }[])[0].ID);
  const hash = await bcrypt.hash(data.password, 10);

  await conn.execute(
    `INSERT INTO CLAN (ID_CLANA, IME, PRIIMEK, EMAIL, NASLOV)
     VALUES (:memberId, :firstName, :lastName, :email, :address)`,
    {
      memberId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      address: data.address,
    },
    { autoCommit: false }
  );

  const tierRow = await conn.execute<{ ID_NIVOJA: number }>(
    `SELECT ID_NIVOJA FROM NIVO_LOJALNOSTI WHERE KODA = :code`,
    { code: data.tierCode },
    { autoCommit: false }
  );
  const tierId = Number((tierRow.rows as { ID_NIVOJA: number }[])[0].ID_NIVOJA);

  await conn.execute(
    `INSERT INTO STATUS_CLANA (ID_STATUSA, ID_CLANA, ID_NIVOJA, RAZLOG_SPREMEMBE, TRENUTNI)
     VALUES (seq_status.NEXTVAL, :memberId, :tierId, 'Začetni demo podatki', 'Y')`,
    { memberId, tierId },
    { autoCommit: false }
  );

  await conn.execute(
    `INSERT INTO KARTICA_LOJALNOSTI (ID_KARTICE, ID_CLANA, STEVILKA_KARTICE, STATUS_POSILJANJA)
     VALUES (seq_kartica.NEXTVAL, :memberId, :card, 'DELIVERED')`,
    { memberId, card: `MC-DEMO-${memberId}` },
    { autoCommit: false }
  );

  const accRow = await conn.execute<{ ID: number }>(
    `SELECT seq_racun.NEXTVAL AS ID FROM DUAL`
  );
  const accountId = Number((accRow.rows as { ID: number }[])[0].ID);

  await conn.execute(
    `INSERT INTO UPORABNISK_RACUN (ID_RACUNA, ID_CLANA, UPORABNISKO_IME, GESLO_HASH, VLOGA, EMAIL_VERIFICIRAN)
     VALUES (:accountId, :memberId, :email, :hash, 'CLAN', :verified)`,
    {
      accountId,
      memberId,
      email: data.email,
      hash,
      verified: data.verified ? 'Y' : 'N',
    },
    { autoCommit: false }
  );

  return memberId;
}

async function main() {
  await initDb();

  const robertByName = await query<{ ID_CLANA: number; EMAIL: string }>(
    `SELECT ID_CLANA, EMAIL FROM CLAN WHERE IME = 'Robert' AND PRIIMEK = 'Brodnik'`
  );
  if (robertByName[0] && robertByName[0].EMAIL !== ROBERT_BRODNIK_EMAIL) {
    await execute(
      `UPDATE CLAN SET EMAIL = :newEmail WHERE ID_CLANA = :memberId`,
      { newEmail: ROBERT_BRODNIK_EMAIL, memberId: robertByName[0].ID_CLANA }
    );
    await execute(
      `UPDATE UPORABNISK_RACUN SET UPORABNISKO_IME = :newEmail WHERE ID_CLANA = :memberId`,
      { newEmail: ROBERT_BRODNIK_EMAIL, memberId: robertByName[0].ID_CLANA }
    );
  }

  // Check if members already exist
  const existing = await query(
    `SELECT EMAIL FROM CLAN WHERE EMAIL IN ('marko.kovac@maestro.si', 'luka.petrov@maestro.si', :robertEmail)`,
    { robertEmail: ROBERT_BRODNIK_EMAIL }
  );

  if (existing.length >= 3) {
    console.log('All demo members already exist.');
    await closeDb();
    return;
  }

  console.log('Adding missing demo members and their purchases...\n');

  await withTransaction(async (conn) => {
    // Add Marko Kovač if missing
    const markoExists = await query(
      `SELECT ID_CLANA FROM CLAN WHERE EMAIL = 'marko.kovac@maestro.si'`
    );

    let markoId: number;
    if (markoExists.length > 0) {
      markoId = markoExists[0].ID_CLANA;
      console.log(`✓ Marko Kovač already exists (ID: ${markoId})`);
    } else {
      markoId = await createMember(conn, {
        firstName: 'Marko',
        lastName: 'Kovač',
        email: 'marko.kovac@maestro.si',
        password: 'member123',
        address: 'Trubarjeva 5, 1000 Ljubljana',
        tierCode: 'BRONASTI',
        verified: true,
      });
      console.log(`✓ Created Marko Kovač (ID: ${markoId}, Bronze tier)`);
    }

    // Add Luka Petrov if missing
    const lukaExists = await query(
      `SELECT ID_CLANA FROM CLAN WHERE EMAIL = 'luka.petrov@maestro.si'`
    );

    let lukaId: number;
    if (lukaExists.length > 0) {
      lukaId = lukaExists[0].ID_CLANA;
      console.log(`✓ Luka Petrov already exists (ID: ${lukaId})`);
    } else {
      lukaId = await createMember(conn, {
        firstName: 'Luka',
        lastName: 'Petrov',
        email: 'luka.petrov@maestro.si',
        password: 'member123',
        address: 'Prešernova 10, 1000 Ljubljana',
        tierCode: 'OSNOVNI',
        verified: true,
      });
      console.log(`✓ Created Luka Petrov (ID: ${lukaId}, Basic tier)`);
    }

    const robertExists = await query(
      `SELECT ID_CLANA FROM CLAN WHERE EMAIL = :email`,
      { email: ROBERT_BRODNIK_EMAIL }
    );

    let robertId: number;
    if (robertExists.length > 0) {
      robertId = robertExists[0].ID_CLANA;
      console.log(`✓ Robert Brodnik already exists (ID: ${robertId})`);
    } else {
      robertId = await createMember(conn, {
        firstName: 'Robert',
        lastName: 'Brodnik',
        email: ROBERT_BRODNIK_EMAIL,
        password: 'member123',
        address: 'Cankarjeva 12, 1000 Ljubljana',
        tierCode: 'OSNOVNI',
        verified: true,
      });
      console.log(`✓ Created Robert Brodnik (ID: ${robertId}, Basic tier)`);
    }

    // Add purchases for both members
    const purchases = [
      { memberId: markoId, month: 1, year: 2026, amount: 180 },
      { memberId: markoId, month: 2, year: 2026, amount: 250 },
      { memberId: markoId, month: 3, year: 2026, amount: 120 },
      { memberId: lukaId, month: 1, year: 2026, amount: 150 },
      { memberId: lukaId, month: 2, year: 2026, amount: 320 },
      { memberId: lukaId, month: 3, year: 2026, amount: 420 },
    ];

    let addedPurchases = 0;
    for (const p of purchases) {
      // Check if purchase already exists
      const existingPurchase = await query(
        `SELECT n.ID_NAKUPA FROM NAKUP n
         JOIN OBRACUNSKO_OBDOBJE o ON o.ID_OBDOBJA = n.ID_OBDOBJA
         WHERE n.ID_CLANA = :memberId AND o.MESEC = :month AND o.LETO = :year`,
        { memberId: p.memberId, month: p.month, year: p.year }
      );

      if (existingPurchase.length > 0) {
        continue;
      }

      let periodRows = await conn.execute<{ ID_OBDOBJA: number }>(
        `SELECT ID_OBDOBJA FROM OBRACUNSKO_OBDOBJE WHERE MESEC = :month AND LETO = :year`,
        { month: p.month, year: p.year },
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
           VALUES (:id, :month, :year, 'CLOSED')`,
          { id: periodId, month: p.month, year: p.year },
          { autoCommit: false }
        );
      }

      await conn.execute(
        `INSERT INTO NAKUP (ID_NAKUPA, ID_CLANA, ID_OBDOBJA, ZNESEK)
         VALUES (seq_nakup.NEXTVAL, :memberId, :periodId, :amount)`,
        { memberId: p.memberId, periodId, amount: p.amount },
        { autoCommit: false }
      );
      addedPurchases++;
    }

    console.log(`✓ Added ${addedPurchases} purchases\n`);

    // Add initial points if they don't have any
    const markoPoints = await query(
      `SELECT SUM(STEVILO_TOCK) AS TOTAL FROM TOCKE_TRANSAKCIJA WHERE ID_CLANA = :memberId`,
      { memberId: markoId }
    );

    if (!markoPoints[0]?.TOTAL || markoPoints[0].TOTAL === null) {
      await conn.execute(
        `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
         VALUES (seq_tocke.NEXTVAL, :memberId, 1200, 'EARNED', 'Začetno stanje demo')`,
        { memberId: markoId },
        { autoCommit: false }
      );
      console.log(`✓ Added initial points for Marko Kovač (1200)`);
    }

    const lukaPoints = await query(
      `SELECT SUM(STEVILO_TOCK) AS TOTAL FROM TOCKE_TRANSAKCIJA WHERE ID_CLANA = :memberId`,
      { memberId: lukaId }
    );

    if (!lukaPoints[0]?.TOTAL || lukaPoints[0].TOTAL === null) {
      await conn.execute(
        `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
         VALUES (seq_tocke.NEXTVAL, :memberId, 500, 'EARNED', 'Začetno stanje demo')`,
        { memberId: lukaId },
        { autoCommit: false }
      );
      console.log(`✓ Added initial points for Luka Petrov (500)`);
    }

    const robertPoints = await query(
      `SELECT SUM(STEVILO_TOCK) AS TOTAL FROM TOCKE_TRANSAKCIJA WHERE ID_CLANA = :memberId`,
      { memberId: robertId }
    );

    if (!robertPoints[0]?.TOTAL || robertPoints[0].TOTAL === null) {
      await conn.execute(
        `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
         VALUES (seq_tocke.NEXTVAL, :memberId, 800, 'EARNED', 'Začetno stanje demo')`,
        { memberId: robertId },
        { autoCommit: false }
      );
      console.log(`✓ Added initial points for Robert Brodnik (800)`);
    }
  });

  console.log('\n✓ Demo data updated successfully!');
  console.log('Now run: npm run job:monthly -- 1 2026\n');

  await closeDb();
}

main().catch((e) => {
  const err = e as { errorNum?: number };
  if (err.errorNum === 942) {
    console.error('\nTables are missing. Run schema setup first:\n  npm run db:init-schema\n');
  } else {
    console.error(e);
  }
  process.exit(1);
});

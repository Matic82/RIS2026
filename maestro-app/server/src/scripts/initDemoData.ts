import bcrypt from 'bcryptjs';
import { initDb, closeDb, withTransaction, query } from '../db.js';
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

  const existing = await query(
    `SELECT ID_RACUNA FROM UPORABNISK_RACUN WHERE UPORABNISKO_IME = 'admin@maestro.si'`
  );
  if (existing.length) {
    console.log('Demo data already exists.');
    await closeDb();
    return;
  }

  const adminHash = await bcrypt.hash('admin123', 10);

  await withTransaction(async (conn) => {
    const adminAcc = await conn.execute<{ ID: number }>(
      `SELECT seq_racun.NEXTVAL AS ID FROM DUAL`
    );
    const adminId = Number((adminAcc.rows as { ID: number }[])[0].ID);
    await conn.execute(
      `INSERT INTO UPORABNISK_RACUN (ID_RACUNA, UPORABNISKO_IME, GESLO_HASH, VLOGA, EMAIL_VERIFICIRAN)
       VALUES (:id, 'admin@maestro.si', :hash, 'ADMIN', 'Y')`,
      { id: adminId, hash: adminHash },
      { autoCommit: false }
    );

    const anaId = await createMember(conn, {
      firstName: 'Ana',
      lastName: 'Novak',
      email: 'ana.novak@maestro.si',
      password: 'member123',
      address: 'Slovenska cesta 1, 1000 Ljubljana',
      tierCode: 'SREBRNI',
      verified: true,
    });

    const markoId = await createMember(conn, {
      firstName: 'Marko',
      lastName: 'Kovač',
      email: 'marko.kovac@maestro.si',
      password: 'member123',
      address: 'Trubarjeva 5, 1000 Ljubljana',
      tierCode: 'BRONASTI',
      verified: true,
    });

    const lukaId = await createMember(conn, {
      firstName: 'Luka',
      lastName: 'Petrov',
      email: 'luka.petrov@maestro.si',
      password: 'member123',
      address: 'Prešernova 10, 1000 Ljubljana',
      tierCode: 'OSNOVNI',
      verified: true,
    });

    const robertId = await createMember(conn, {
      firstName: 'Robert',
      lastName: 'Brodnik',
      email: ROBERT_BRODNIK_EMAIL,
      password: 'member123',
      address: 'Cankarjeva 12, 1000 Ljubljana',
      tierCode: 'OSNOVNI',
      verified: true,
    });

    // Ana Novak purchases (350 in January, 520 in February)
    const anaPurchases = [
      { month: 1, year: 2026, amount: 350 },
      { month: 2, year: 2026, amount: 520 },
      { month: 3, year: 2026, amount: 610 },
    ];

    // Marko Kovač purchases (Bronze tier member)
    const markoPurchases = [
      { month: 1, year: 2026, amount: 180 },
      { month: 2, year: 2026, amount: 250 },
      { month: 3, year: 2026, amount: 120 },
    ];

    // Luka Petrov purchases (Basic tier member)
    const lukaPurchases = [
      { month: 1, year: 2026, amount: 150 },
      { month: 2, year: 2026, amount: 320 },
      { month: 3, year: 2026, amount: 420 },
    ];

    const allPurchases = [
      ...anaPurchases.map((p) => ({ ...p, memberId: anaId })),
      ...markoPurchases.map((p) => ({ ...p, memberId: markoId })),
      ...lukaPurchases.map((p) => ({ ...p, memberId: lukaId })),
    ];

    for (const p of allPurchases) {
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
    }

    // Initial points for all members
    await conn.execute(
      `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
       VALUES (seq_tocke.NEXTVAL, :memberId, 3500, 'EARNED', 'Začetno stanje demo')`,
      { memberId: anaId },
      { autoCommit: false }
    );

    await conn.execute(
      `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
       VALUES (seq_tocke.NEXTVAL, :memberId, 1200, 'EARNED', 'Začetno stanje demo')`,
      { memberId: markoId },
      { autoCommit: false }
    );

    await conn.execute(
      `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
       VALUES (seq_tocke.NEXTVAL, :memberId, 500, 'EARNED', 'Začetno stanje demo')`,
      { memberId: lukaId },
      { autoCommit: false }
    );

    await conn.execute(
      `INSERT INTO TOCKE_TRANSAKCIJA (ID_TRANSAKCIJE, ID_CLANA, STEVILO_TOCK, TIP, OPIS)
       VALUES (seq_tocke.NEXTVAL, :memberId, 800, 'EARNED', 'Začetno stanje demo')`,
      { memberId: robertId },
      { autoCommit: false }
    );
  });

  console.log('\nDemo accounts created:');
  console.log('  Admin:  admin@maestro.si / admin123');
  console.log('  Member: ana.novak@maestro.si / member123 (Silver tier)');
  console.log('  Member: marko.kovac@maestro.si / member123 (Bronze tier)');
  console.log('  Member: luka.petrov@maestro.si / member123 (Basic tier)');
  console.log(`  Member: ${ROBERT_BRODNIK_EMAIL} / member123 (Basic tier)\n`);

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

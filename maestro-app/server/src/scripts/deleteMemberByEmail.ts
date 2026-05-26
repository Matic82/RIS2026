/**
 * Permanently delete a member and all related data by email.
 * Usage: tsx src/scripts/deleteMemberByEmail.ts <email>
 */

import { initDb, closeDb, withTransaction, query } from '../db.js';

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) {
    console.error('Usage: tsx src/scripts/deleteMemberByEmail.ts <email>');
    process.exit(1);
  }

  await initDb();

  const members = await query<{ ID_CLANA: number; IME: string; PRIIMEK: string; EMAIL: string }>(
    `SELECT ID_CLANA, IME, PRIIMEK, EMAIL FROM CLAN WHERE LOWER(EMAIL) = :email`,
    { email }
  );

  if (!members.length) {
    console.log(`No member found with email: ${email}`);
    await closeDb();
    return;
  }

  const member = members[0];
  const memberId = member.ID_CLANA;

  const accounts = await query<{ ID_RACUNA: number }>(
    `SELECT ID_RACUNA FROM UPORABNISK_RACUN WHERE ID_CLANA = :memberId`,
    { memberId }
  );
  const accountId = accounts[0]?.ID_RACUNA;

  console.log(`Deleting ${member.IME} ${member.PRIIMEK} (${member.EMAIL}), ID: ${memberId}...`);

  await withTransaction(async (conn) => {
    await conn.execute(
      `DELETE FROM UVELJAVITEV_NAGRADE WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM TOCKE_TRANSAKCIJA WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM NAKUP WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM OBVESTILO WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );

    if (accountId) {
      await conn.execute(
        `DELETE FROM EMAIL_VERIFIKACIJA WHERE ID_RACUNA = :accountId`,
        { accountId },
        { autoCommit: false }
      );
      await conn.execute(
        `DELETE FROM REVIZIJSKI_DNEVNIK WHERE ID_RACUNA = :accountId`,
        { accountId },
        { autoCommit: false }
      );
      await conn.execute(
        `DELETE FROM PONASTAVITEV_GESLA WHERE ID_RACUNA = :accountId`,
        { accountId },
        { autoCommit: false }
      );
      await conn.execute(
        `DELETE FROM UPORABNISK_RACUN WHERE ID_RACUNA = :accountId`,
        { accountId },
        { autoCommit: false }
      );
    }

    await conn.execute(
      `DELETE FROM REVIZIJSKI_DNEVNIK WHERE ENTITETA = 'CLAN' AND ID_ENTITETE = :memberId`,
      { memberId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM STATUS_CLANA WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM KARTICA_LOJALNOSTI WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );
    await conn.execute(
      `DELETE FROM CLAN WHERE ID_CLANA = :memberId`,
      { memberId },
      { autoCommit: false }
    );
  });

  console.log('✓ Member deleted successfully.');
  await closeDb();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});

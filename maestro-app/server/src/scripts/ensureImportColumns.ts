import { initDb, closeDb, getConnection } from '../db.js';

async function columnExists(
  conn: Awaited<ReturnType<typeof getConnection>>,
  columnName: string
): Promise<boolean> {
  const result = await conn.execute<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM user_tab_columns
     WHERE table_name = 'OBRACUNSKO_OBDOBJE' AND column_name = :col`,
    { col: columnName.toUpperCase() }
  );
  return Number((result.rows as { CNT: number }[])[0]?.CNT ?? 0) > 0;
}

async function main() {
  await initDb();
  const conn = await getConnection();

  try {
    if (!(await columnExists(conn, 'STEVILO_UVOZENIH'))) {
      await conn.execute(
        `ALTER TABLE OBRACUNSKO_OBDOBJE ADD (STEVILO_UVOZENIH NUMBER DEFAULT 0)`,
        {},
        { autoCommit: true }
      );
      console.log('Added STEVILO_UVOZENIH column.');
    }

    if (!(await columnExists(conn, 'NAPAKE_UVOZA'))) {
      await conn.execute(
        `ALTER TABLE OBRACUNSKO_OBDOBJE ADD (NAPAKE_UVOZA VARCHAR2(4000))`,
        {},
        { autoCommit: true }
      );
      console.log('Added NAPAKE_UVOZA column.');
    }

    console.log('Import metadata columns ready.');
  } finally {
    await conn.close();
    await closeDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

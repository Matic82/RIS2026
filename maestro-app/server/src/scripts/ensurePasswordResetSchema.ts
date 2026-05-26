import { initDb, closeDb, getConnection } from '../db.js';

async function tableExists(
  conn: Awaited<ReturnType<typeof getConnection>>,
  tableName: string
): Promise<boolean> {
  const result = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM user_tables WHERE table_name = :name`,
    { name: tableName.toUpperCase() }
  );
  const row = result.rows as { CNT: number }[];
  return Number(row[0]?.CNT ?? 0) > 0;
}

async function main() {
  await initDb();
  const conn = await getConnection();

  try {
    const hasTable = await tableExists(conn, 'PONASTAVITEV_GESLA');
    if (hasTable) {
      console.log('PONASTAVITEV_GESLA already exists.');
      return;
    }

    console.log('Creating PONASTAVITEV_GESLA and seq_reset_gesla...');

    await conn.execute(
      `CREATE SEQUENCE seq_reset_gesla START WITH 1 INCREMENT BY 1 NOCACHE`,
      {},
      { autoCommit: true }
    );

    await conn.execute(
      `CREATE TABLE PONASTAVITEV_GESLA (
        ID                  NUMBER PRIMARY KEY,
        ID_RACUNA           NUMBER NOT NULL REFERENCES UPORABNISK_RACUN(ID_RACUNA),
        TOKEN               VARCHAR2(64) NOT NULL,
        POTEK               TIMESTAMP NOT NULL,
        UPORABLJEN          CHAR(1) DEFAULT 'N' NOT NULL CHECK (UPORABLJEN IN ('Y', 'N')),
        CONSTRAINT uq_reset_gesla_token UNIQUE (TOKEN)
      )`,
      {},
      { autoCommit: true }
    );

    console.log('Password reset schema created successfully.');
  } finally {
    await conn.close();
    await closeDb();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

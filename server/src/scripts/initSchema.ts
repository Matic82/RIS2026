import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb, getConnection } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.resolve(__dirname, '../../../database');

const SQL_FILES = ['01_schema.sql', '02_seed.sql'];

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0 && !/^COMMIT$/i.test(s));
}

async function tableExists(conn: Awaited<ReturnType<typeof getConnection>>): Promise<boolean> {
  const result = await conn.execute(
    `SELECT COUNT(*) AS CNT FROM user_tables WHERE table_name = 'CLAN'`
  );
  const row = result.rows as { CNT: number }[];
  return Number(row[0]?.CNT ?? 0) > 0;
}

async function runSqlFile(
  conn: Awaited<ReturnType<typeof getConnection>>,
  filePath: string
): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const statements = splitStatements(sql);
  console.log(`Running ${path.basename(filePath)} (${statements.length} statements)...`);

  for (const statement of statements) {
    try {
      await conn.execute(statement, {}, { autoCommit: true });
    } catch (e: unknown) {
      const err = e as { errorNum?: number; message?: string };
      // ORA-00955: name already used, ORA-02289: sequence exists
      if (err.errorNum === 955 || err.errorNum === 2289) {
        continue;
      }
      console.error('Failed statement:', statement.slice(0, 120) + '...');
      throw e;
    }
  }
}

async function main() {
  if (!fs.existsSync(databaseDir)) {
    console.error(`Database folder not found: ${databaseDir}`);
    process.exit(1);
  }

  await initDb();
  const conn = await getConnection();

  try {
    if (await tableExists(conn)) {
      console.log('Schema already exists (CLAN table found). Skipping DDL/seed.');
      console.log('To reset: docker compose down -v && docker compose up -d, then npm run db:init-schema');
      return;
    }

    for (const file of SQL_FILES) {
      const filePath = path.join(databaseDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing ${filePath}`);
      }
      await runSqlFile(conn, filePath);
    }

    console.log('Schema and seed data applied successfully.');
  } finally {
    await conn.close();
    await closeDb();
  }
}

main().catch((e) => {
  console.error(e);
  console.error('\nTip: Start Oracle first:  docker compose up -d');
  console.error('Then wait ~2 min and run:  npm run db:init-schema');
  process.exit(1);
});

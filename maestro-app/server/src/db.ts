import oracledb from 'oracledb';
import { config } from './config.js';

let pool: oracledb.Pool | null = null;

export async function initDb(): Promise<void> {
  if (pool) return;
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.fetchAsString = [oracledb.CLOB];
  pool = await oracledb.createPool({
    user: config.oracle.user,
    password: config.oracle.password,
    connectString: config.oracle.connectString,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
  });
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.close(0);
    pool = null;
  }
}

export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) await initDb();
  return pool!.getConnection();
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options?: oracledb.ExecuteOptions
): Promise<T[]> {
  const conn = await getConnection();
  try {
    const result = await conn.execute<T>(sql, binds, {
      autoCommit: options?.autoCommit ?? false,
      ...options,
    });
    return (result.rows as T[]) || [];
  } finally {
    await conn.close();
  }
}

export async function execute(
  sql: string,
  binds: oracledb.BindParameters = {},
  autoCommit = true
): Promise<oracledb.Result<unknown>> {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, { autoCommit });
    return result;
  } catch (e) {
    if (!autoCommit) await conn.rollback();
    throw e;
  } finally {
    await conn.close();
  }
}

export async function withTransaction<T>(
  fn: (conn: oracledb.Connection) => Promise<T>
): Promise<T> {
  const conn = await getConnection();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    await conn.close();
  }
}

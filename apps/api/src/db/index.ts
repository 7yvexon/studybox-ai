import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { config } from "../config.js";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000
});

export const query = <T extends QueryResultRow>(text: string, values: unknown[] = []) =>
  pool.query<T>(text, values);

export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const closeDatabase = () => pool.end();

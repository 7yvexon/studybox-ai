import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { closeDatabase, pool } from "../db/index.js";

const migrationDirectory = fileURLToPath(new URL("../db/migrations/", import.meta.url));

const migrate = async () => {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );
  const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);

    if (applied.rowCount) {
      continue;
    }

    const source = await readFile(join(migrationDirectory, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(source);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      await client.query("COMMIT");
      process.stdout.write(`Applied ${file}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
};

migrate()
  .then(() => closeDatabase())
  .catch(async (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Migration failed"}\n`);
    await closeDatabase();
    process.exitCode = 1;
  });

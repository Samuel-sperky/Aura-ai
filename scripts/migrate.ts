// Idempotent migration runner.
// Applies db/migrations/*.sql in filename (alphabetical) order, recording each
// applied file in a `_migrations` ledger so re-runs are no-ops. Each .sql file is
// stripped of comments, split on `;` and executed statement-by-statement inside
// ONE transaction per file — a half-applied migration is impossible (for
// transactional DDL; note MariaDB DDL is not transactional, so keep each file
// small and re-runnable).
//
// Usage: npm run db:migrate
//   (in Docker: docker compose --env-file .env --profile tools run --rm migrator npm run db:migrate)
import "./_bootstrap";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getPool, withTransaction } from "../src/lib/db";

const MIGRATIONS_DIR = resolve(process.cwd(), "db", "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await getPool().query(
    `CREATE TABLE IF NOT EXISTS \`_migrations\` (
       \`name\` VARCHAR(255) NOT NULL,
       \`applied_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (\`name\`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

async function appliedSet(): Promise<Set<string>> {
  const rows = (await getPool().query(
    "SELECT name FROM `_migrations`",
  )) as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

/**
 * Split a SQL file into individual statements. Our migrations use plain `;`
 * terminators and no stored routines, so a simple splitter suffices — and it
 * avoids needing `multipleStatements` (kept OFF for safety).
 */
function splitStatements(sql: string): string[] {
  // Strip SQL line comments. MariaDB requires `--` to be followed by
  // whitespace/EOL, so we drop full-line comments and trailing ` -- text`.
  // (Migrations must never contain `--` inside a string literal.)
  const noComments = sql
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("--")) return "";
      return line.replace(/\s--\s.*$/, "");
    })
    .join("\n");
  return noComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main(): Promise<void> {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.log(`No migrations directory at ${MIGRATIONS_DIR} — nothing to do.`);
    return;
  }

  await ensureMigrationsTable();
  const done = await appliedSet();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found in db/migrations.");
    return;
  }

  let appliedCount = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`= skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    const statements = splitStatements(sql);

    await withTransaction(async (conn) => {
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.query("INSERT INTO `_migrations` (`name`) VALUES (?)", [file]);
    });

    appliedCount++;
    console.log(`+ applied ${file} (${statements.length} statements)`);
  }

  console.log(
    appliedCount === 0
      ? "Up to date — nothing to apply."
      : `Done — applied ${appliedCount} migration(s).`,
  );
}

main()
  .then(() => getPool().end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Migration failed:", err);
    try {
      await getPool().end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });

// Static guards over db/migrations/*.sql.
//
// These migrations are never executed by the unit suite (no DB in CI), so this
// file is the safety net instead: it parses the SQL the same way
// scripts/migrate.ts does (strip comments -> split on `;`) and asserts the
// family conventions and the contract's hard rules hold. A convention drift
// fails here, at `npm test`, instead of at `npm run db:migrate` against a real
// MariaDB - or worse, months later against real rows.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = dirname(fileURLToPath(import.meta.url));

/** Expected number of `CREATE TABLE` statements per migration file. */
const EXPECTED_TABLE_COUNT: Record<string, number> = {
  "0001_init.sql": 6,
  "0002_domain.sql": 13,
};

/** The optimistic-concurrency set: the ONLY tables carrying a `version` column. */
const VERSIONED_TABLES = ["checkpoints", "sprints", "work_items"] as const;

/**
 * The source app's brand name, assembled at runtime so the literal never
 * appears in this repository - which is exactly what the assertion enforces.
 */
const LEGACY_BRAND = ["north", "star"].join("");

/** Columns the port deliberately dropped. Any reappearance is a regression. */
const FORBIDDEN_COLUMNS = [
  "deleted_at", // no soft delete anywhere - hard delete + audit_log
  "portfolio", // renamed to `area`
  "program", // one level of grouping only
  "budget",
  "spent", // money is out of scope
  "timeline_start",
  "timeline_span",
  "task_count",
  "completed_task_count",
  "risks",
  "value_score",
  "risk_score",
  "urgency_score",
  "effort_score",
  "priority_score", // weighted prioritisation is out of scope
  "dependency_type",
  "lag_days", // only "blocks" exists
  "team_id",
  "workstream", // teams are out of scope
  "severity", // notifications do not branch on importance
  "date_label", // derived for display
  "password_salt", // argon2id embeds its own salt
];

// ---------------------------------------------------------------------------
// Parsing - mirrors scripts/migrate.ts so the test sees what the runner sees.
// ---------------------------------------------------------------------------

/** Strip SQL line comments exactly like scripts/migrate.ts does. */
function stripComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("--")) return "";
      return line.replace(/\s--\s.*$/, "");
    })
    .join("\n");
}

function splitStatements(sql: string): string[] {
  return stripComments(sql)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface TableDef {
  readonly file: string;
  readonly name: string;
  /** Everything between the outer parentheses of the CREATE TABLE. */
  readonly body: string;
  readonly statement: string;
}

function parseTables(file: string, sql: string): TableDef[] {
  const tables: TableDef[] = [];
  for (const statement of splitStatements(sql)) {
    const head = statement.match(/^CREATE TABLE IF NOT EXISTS\s+`(\w+)`\s*\(/i);
    if (!head) continue;
    const open = statement.indexOf("(");
    const close = statement.lastIndexOf(")");
    tables.push({
      file,
      name: head[1],
      body: statement.slice(open + 1, close),
      statement,
    });
  }
  return tables;
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const raw = new Map(
  files.map((f) => [f, readFileSync(join(MIGRATIONS_DIR, f), "utf8")] as const),
);

/** Every table, in the order the runner will create them. */
const allTables: TableDef[] = files.flatMap((f) =>
  parseTables(f, raw.get(f) as string),
);

// ---------------------------------------------------------------------------

describe("db/migrations - file set", () => {
  it("contains exactly the expected migration files", () => {
    expect(files).toEqual(Object.keys(EXPECTED_TABLE_COUNT).sort());
  });

  it("every .sql file is readable and non-empty", () => {
    for (const file of files) {
      expect((raw.get(file) as string).trim().length, file).toBeGreaterThan(0);
    }
  });

  it("does not create the `_migrations` ledger (scripts/migrate.ts owns it)", () => {
    expect(allTables.map((t) => t.name)).not.toContain("_migrations");
  });
});

describe("db/migrations - statement shape", () => {
  it("uses only CREATE TABLE IF NOT EXISTS / CREATE INDEX / INSERT", () => {
    const allowed =
      /^(CREATE TABLE IF NOT EXISTS\s|CREATE (UNIQUE )?INDEX\s|INSERT\s)/i;
    for (const file of files) {
      for (const statement of splitStatements(raw.get(file) as string)) {
        expect(
          allowed.test(statement),
          `${file}: unexpected statement -> ${statement.slice(0, 80)}`,
        ).toBe(true);
      }
    }
  });

  it("creates the expected number of tables per file", () => {
    for (const [file, expected] of Object.entries(EXPECTED_TABLE_COUNT)) {
      const count = allTables.filter((t) => t.file === file).length;
      expect(count, file).toBe(expected);
    }
  });

  it("creates 19 tables in total", () => {
    expect(allTables).toHaveLength(19);
  });

  it("declares every table exactly once", () => {
    const names = allTables.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("db/migrations - family conventions", () => {
  it("every CREATE TABLE is InnoDB / utf8mb4", () => {
    for (const table of allTables) {
      expect(table.statement, `${table.file}: ${table.name}`).toMatch(
        /\)\s*ENGINE=InnoDB\s+DEFAULT\s+CHARSET=utf8mb4$/i,
      );
    }
  });

  it("every table declares a PRIMARY KEY", () => {
    for (const table of allTables) {
      expect(table.body, table.name).toMatch(/PRIMARY KEY\s*\(/i);
    }
  });

  it("an `id` column is CHAR(36), or BIGINT AUTO_INCREMENT on log tables", () => {
    for (const table of allTables) {
      const id = table.body.match(/^\s*`id`\s+([^,\n]+)/m);
      if (!id) continue; // composite-PK tables have no `id`
      expect(id[1].trim(), table.name).toMatch(
        /^(CHAR\(36\) NOT NULL|BIGINT NOT NULL AUTO_INCREMENT)$/i,
      );
    }
  });

  it("every table has created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", () => {
    const logTables = new Set(["auth_attempts", "audit_log", "app_config"]);
    for (const table of allTables) {
      if (logTables.has(table.name)) continue; // these stamp `ts` / `updated_at`
      expect(table.body, table.name).toMatch(
        /`created_at`\s+DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP/i,
      );
    }
  });

  it("names every index ix_*, every unique key uq_*, every FK fk_*", () => {
    for (const table of allTables) {
      for (const [, kind, name] of table.body.matchAll(
        /(UNIQUE KEY|KEY|CONSTRAINT)\s+`(\w+)`/g,
      )) {
        const prefix =
          kind === "CONSTRAINT" ? "fk_" : kind === "UNIQUE KEY" ? "uq_" : "ix_";
        expect(name, `${table.name}: ${kind} ${name}`).toMatch(
          new RegExp(`^${prefix}`),
        );
      }
    }
  });

  it("uses ENUM-like VARCHARs, never a DB ENUM (values are validated by zod)", () => {
    for (const table of allTables) {
      expect(table.body, table.name).not.toMatch(/\bENUM\s*\(/i);
    }
  });
});

describe("db/migrations - contract hard rules", () => {
  it(`never mentions "${LEGACY_BRAND}", not even in a comment`, () => {
    for (const file of files) {
      expect((raw.get(file) as string).toLowerCase(), file).not.toContain(
        LEGACY_BRAND,
      );
    }
  });

  it("declares none of the dropped columns", () => {
    for (const table of allTables) {
      for (const column of FORBIDDEN_COLUMNS) {
        expect(
          table.body.includes(`\`${column}\``),
          `${table.name} must not declare \`${column}\``,
        ).toBe(false);
      }
    }
  });

  it("has no soft delete anywhere", () => {
    for (const file of files) {
      expect(stripComments(raw.get(file) as string), file).not.toContain(
        "deleted_at",
      );
    }
  });

  it("puts `version` on exactly the 3 optimistic-concurrency tables", () => {
    const versioned = allTables
      .filter((t) => /^\s*`version`\s+INT NOT NULL DEFAULT 1\b/m.test(t.body))
      .map((t) => t.name);
    expect(versioned.sort()).toEqual([...VERSIONED_TABLES].sort());
    expect(versioned).toHaveLength(3);
  });

  it("has no `areas` table - `area` is a VARCHAR on the project", () => {
    expect(allTables.map((t) => t.name)).not.toContain("areas");
    const projects = allTables.find((t) => t.name === "projects");
    expect(projects?.body).toMatch(/`area`\s+VARCHAR\(80\)/i);
  });

  it("keeps work_item_dependencies keyed on (source_id, target_id) only", () => {
    const deps = allTables.find((t) => t.name === "work_item_dependencies");
    expect(deps?.body).toMatch(/PRIMARY KEY\s*\(`source_id`,\s*`target_id`\)/i);
  });

  it("lets work_items self-reference for the 2-level hierarchy", () => {
    const items = allTables.find((t) => t.name === "work_items");
    expect(items?.body).toMatch(
      /FOREIGN KEY \(`parent_id`\) REFERENCES `work_items` \(`id`\)/i,
    );
  });

  it("keeps checkpoint_decisions supersedable (immutability by append)", () => {
    const decisions = allTables.find((t) => t.name === "checkpoint_decisions");
    expect(decisions?.body).toMatch(/`superseded_by`\s+CHAR\(36\) NULL/i);
    expect(decisions?.body).toMatch(/`outcome`\s+VARCHAR\(16\) NOT NULL/i);
  });
});

describe("db/migrations - referential integrity", () => {
  it("references only tables created earlier (or itself)", () => {
    const created = new Set<string>();
    for (const table of allTables) {
      created.add(table.name); // self-references are legal inside CREATE TABLE
      for (const [, target] of table.body.matchAll(/REFERENCES\s+`(\w+)`/g)) {
        expect(
          created.has(target),
          `${table.file}: ${table.name} references \`${target}\` before it exists`,
        ).toBe(true);
      }
    }
  });

  it("indexes the leading column of every foreign key", () => {
    for (const table of allTables) {
      const indexed = [...table.body.matchAll(/(?:KEY|PRIMARY KEY)\s*(?:`\w+`\s*)?\(\s*`(\w+)`/g)].map(
        (m) => m[1],
      );
      for (const [, column] of table.body.matchAll(
        /FOREIGN KEY \(`(\w+)`\)/g,
      )) {
        expect(
          indexed.includes(column),
          `${table.name}: FK column \`${column}\` needs a leading index`,
        ).toBe(true);
      }
    }
  });

  it("gives every foreign key an explicit ON DELETE rule", () => {
    for (const table of allTables) {
      for (const constraint of table.body.split("CONSTRAINT").slice(1)) {
        if (!/FOREIGN KEY/i.test(constraint)) continue;
        expect(constraint, table.name).toMatch(
          /ON DELETE (CASCADE|SET NULL|RESTRICT)/i,
        );
      }
    }
  });
});

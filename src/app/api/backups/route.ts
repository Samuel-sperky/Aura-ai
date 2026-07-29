// GET /api/backups — state of the last mysqldump (right `backup.read`, admin only).
//
// Feeds Nastavenia → Zálohy (spec Q42). The dumps themselves are produced by
// `scripts/backup/backup.ps1`, which keeps the newest three (contract §5 / #90)
// and records the outcome in `backups/backup-status.json`. This endpoint only
// READS: it never starts a backup and never touches a dump.
//
// The response is deliberately metadata-only — file name, size, timestamp. A dump
// contains the whole database, so no endpoint of this app ever serves its content.
//
// DEGRADES INSTEAD OF FAILING: `docker-compose.yml` mounts `./backups` into the
// app container READ-ONLY, but the directory can still be absent (a bare `next
// dev`, a stack started without the mount). That is reported as
// `available: false` with a Slovak explanation rather than a 500 — the section
// then renders an honest "no data here" state instead of an error.

import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

/** Directory the backup script writes to, relative to the app root. */
const BACKUP_DIR = "backups";
/** The status document written by `Update-BackupStatus` in BackupCommon.ps1. */
const STATUS_FILE = "backup-status.json";
/** Retention the script enforces; surfaced so the UI can state it. */
const KEPT_DUMPS = 3;
/** A backup older than this is called out as stale in the UI. */
const STALE_AFTER_DAYS = 7;

export interface BackupFileDto {
  name: string;
  sizeBytes: number;
  /** ISO instant of the file's last modification. */
  modifiedAt: string;
}

export interface BackupStatusDto {
  /** False when the directory is not reachable from this process. */
  available: boolean;
  /** Slovak sentence explaining an unavailable directory, else null. */
  unavailableReason: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastSuccessAt: string | null;
  lastDump: string | null;
  lastSizeBytes: number | null;
  /** How many dumps the retention policy keeps. */
  keptDumps: number;
  /** True when the newest dump is older than `STALE_AFTER_DAYS`. */
  stale: boolean;
  dumps: BackupFileDto[];
}

function emptyStatus(reason: string | null): BackupStatusDto {
  return {
    available: reason === null,
    unavailableReason: reason,
    lastRunAt: null,
    lastStatus: null,
    lastError: null,
    lastSuccessAt: null,
    lastDump: null,
    lastSizeBytes: null,
    keptDumps: KEPT_DUMPS,
    stale: false,
    dumps: [],
  };
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Read and shape `backup-status.json`; a missing/corrupt file is simply empty. */
async function readStatusFile(dir: string): Promise<Partial<BackupStatusDto>> {
  try {
    const raw = await readFile(join(dir, STATUS_FILE), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const doc = parsed as Record<string, unknown>;
    return {
      lastRunAt: str(doc.lastRunAt),
      lastStatus: str(doc.lastStatus),
      lastError: str(doc.lastError),
      lastSuccessAt: str(doc.lastSuccessAt),
      lastDump: str(doc.lastDump),
      lastSizeBytes: num(doc.lastSizeBytes),
    };
  } catch {
    return {};
  }
}

/**
 * List the `.sql` dumps, newest first. Only the retained window is returned:
 * anything past it would be a stale directory listing, not backup state.
 */
async function readDumps(dir: string): Promise<BackupFileDto[]> {
  const names = await readdir(dir);
  const sqlNames = names.filter((n) => n.toLowerCase().endsWith(".sql"));

  const files: BackupFileDto[] = [];
  for (const name of sqlNames) {
    try {
      const info = await stat(join(dir, name));
      if (!info.isFile()) continue;
      files.push({
        name,
        sizeBytes: info.size,
        modifiedAt: info.mtime.toISOString(),
      });
    } catch {
      // A dump being pruned while we list is normal — skip it.
    }
  }

  files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return files.slice(0, KEPT_DUMPS);
}

function isStale(newest: string | null): boolean {
  if (!newest) return false;
  const ms = Date.parse(newest);
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms > STALE_AFTER_DAYS * 86_400_000;
}

export const GET = defineRoute(
  { auth: { right: "backup.read" }, rateLimit: RATE_LIMITS.read },
  async () => {
    const dir = resolve(process.cwd(), BACKUP_DIR);

    let dumps: BackupFileDto[];
    try {
      dumps = await readDumps(dir);
    } catch {
      return jsonOk({
        backups: emptyStatus(
          "Priečinok backups/ nie je z aplikácie dostupný. Stav zálohovania nájdete v logu skriptu.",
        ),
      });
    }

    const status = await readStatusFile(dir);
    const newest = dumps[0]?.modifiedAt ?? status.lastSuccessAt ?? null;

    const body: BackupStatusDto = {
      ...emptyStatus(null),
      ...status,
      dumps,
      keptDumps: KEPT_DUMPS,
      stale: isStale(newest),
    };

    return jsonOk({ backups: body });
  },
);

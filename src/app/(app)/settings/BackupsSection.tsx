"use client";

// Nastavenia → Zálohy (ADMIN ONLY, right `backup.read`).
//
// READ-ONLY BY DESIGN: dumps are produced by `scripts/backup/backup.ps1` (Task
// Scheduler / by hand), never by a button in the app. A web-triggered mysqldump
// would be a denial-of-service lever and would put database contents behind an
// HTTP route, so this section only reports state.
//
// `available: false` is the normal Docker case today — the app container has no
// `backups/` mount — and is shown as an honest notice, not as an error.

import { useCallback, useEffect, useMemo, useState } from "react";
import { HardDrive, RefreshCw, TriangleAlert } from "lucide-react";
import {
  Badge,
  Button,
  Panel,
  PanelBody,
  PanelHead,
  StatCard,
  Table,
} from "@/components/ui";
import type { TableColumn, Tone } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ApiError, apiGet } from "@/lib/api";
import { EM_DASH, fmtDateTime, fmtInt, fmtNumber } from "@/lib/client/format";
import { t } from "@/lib/i18n";

interface BackupFile {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

interface BackupStatus {
  available: boolean;
  unavailableReason: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastSuccessAt: string | null;
  lastDump: string | null;
  lastSizeBytes: number | null;
  keptDumps: number;
  stale: boolean;
  dumps: BackupFile[];
}

/** Bytes → MB with one decimal; a dump is always reported in the same unit. */
function fmtSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return EM_DASH;
  return `${fmtNumber(bytes / 1_048_576, 1)} MB`;
}

const STATUS_TONE: Readonly<Record<string, Tone>> = {
  success: "ok",
  ok: "ok",
  warning: "warn",
  failed: "danger",
  error: "danger",
};

export function BackupsSection() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    apiGet<{ backups: BackupStatus }>("/api/backups", {
      signal: controller.signal,
    })
      .then((res) => {
        if (!alive) return;
        setStatus(res.backups);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Stav záloh sa nepodarilo načítať.",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [nonce]);

  const columns = useMemo<TableColumn<BackupFile>[]>(
    () => [
      {
        key: "name",
        header: t("settings.backups.col.file"),
        render: (f) => <code className="bs-code">{f.name}</code>,
      },
      {
        key: "size",
        header: t("settings.backups.size"),
        align: "right",
        width: "120px",
        render: (f) => fmtSize(f.sizeBytes),
      },
      {
        key: "modifiedAt",
        header: t("settings.backups.col.created"),
        width: "180px",
        render: (f) => <span className="tnum">{fmtDateTime(f.modifiedAt)}</span>,
      },
    ],
    [],
  );

  return (
    <Panel>
      <PanelHead
        icon={HardDrive}
        title={t("settings.section.backups")}
        subtitle={t("settings.backups.hint")}
        actions={
          <Button
            size="sm"
            variant="ghost"
            icon={RefreshCw}
            onClick={refetch}
            aria-label={t("action.retry")}
          >
            {t("action.retry")}
          </Button>
        }
      />
      <PanelBody>
        {loading && !status ? (
          <LoadingState blocks={1} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} bare />
        ) : !status ? null : !status.available ? (
          <p className="notice notice-warn">
            <TriangleAlert size={16} aria-hidden="true" />
            <span className="notice-body">{status.unavailableReason}</span>
          </p>
        ) : (
          <div className="bs-root">
            {status.stale ? (
              <p className="notice notice-warn">
                <TriangleAlert size={16} aria-hidden="true" />
                <span className="notice-body">{t("settings.backups.stale")}</span>
              </p>
            ) : status.lastSuccessAt ? (
              <p className="notice notice-accent">
                <span className="notice-body">{t("settings.backups.fresh")}</span>
              </p>
            ) : null}

            <div className="kpi-grid" style={{ ["--kpi-cols" as string]: 3 }}>
              <StatCard
                accent="accent"
                label={t("settings.backups.last")}
                value={
                  status.lastSuccessAt ? fmtDateTime(status.lastSuccessAt) : EM_DASH
                }
                sub={
                  status.lastDump ?? t("settings.backups.none")
                }
              />
              <StatCard
                label={t("settings.backups.size")}
                value={fmtSize(status.lastSizeBytes ?? status.dumps[0]?.sizeBytes ?? null)}
                sub={
                  status.lastStatus ? (
                    <Badge tone={STATUS_TONE[status.lastStatus] ?? "neutral"}>
                      {status.lastStatus}
                    </Badge>
                  ) : (
                    EM_DASH
                  )
                }
              />
              <StatCard
                label={t("settings.backups.count")}
                value={fmtInt(status.dumps.length)}
                sub={`${t("settings.backups.retained")}: ${fmtInt(status.keptDumps)}`}
              />
            </div>

            {status.lastError ? (
              <p className="notice notice-danger" role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                <span className="notice-body">{status.lastError}</span>
              </p>
            ) : null}

            <Table
              columns={columns}
              rows={status.dumps}
              rowKey={(f) => f.name}
              caption={t("settings.section.backups")}
              empty={
                <EmptyState
                  bare
                  canAct={false}
                  tone="muted"
                  title={t("settings.backups.none")}
                  description={t("settings.backups.noneDesc")}
                />
              }
            />
          </div>
        )}
      </PanelBody>

      <style>{BACKUPS_CSS}</style>
    </Panel>
  );
}

const BACKUPS_CSS = `
.bs-root { display: flex; flex-direction: column; gap: var(--space-4); }
.bs-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs); color: var(--ink2);
}
`;

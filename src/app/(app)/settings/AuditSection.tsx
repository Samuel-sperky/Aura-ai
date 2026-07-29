"use client";

// Nastavenia → Audit (ADMIN ONLY, right `audit.read`).
//
// Everything that writes lands here (spec Q43), including sign-ins and readiness
// overrides. IP and user agent are derived SERVER-SIDE — the client never sends
// them and cannot influence them, which is the whole point of an audit trail.
//
// The action and entity filters are populated from what the current page actually
// contains rather than from a hard-coded list: the vocabulary grows with every
// module (`work_item.rank`, `readiness.override`, …) and a stale hard-coded list
// would quietly hide the newest actions.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import {
  Badge,
  Field,
  Input,
  Pagination,
  Panel,
  PanelBody,
  PanelHead,
  Select,
  Table,
  Toolbar,
  ToolbarSearch,
  ToolbarSpacer,
} from "@/components/ui";
import type { TableColumn, Tone } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { ApiError, apiGet, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import { EM_DASH, fmtDateTime } from "@/lib/client/format";
import { t } from "@/lib/i18n";

const SEARCH_DEBOUNCE_MS = 350;

/** `GET /api/audit` row (restated: a client file never imports a route module). */
interface AuditEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  ts: string | null;
  severity: "info" | "success" | "warning" | "critical" | null;
  detail: string | null;
}

/** Severity is DATA STATE, so it is the one place a semantic tone belongs here. */
const SEVERITY_TONE: Readonly<Record<string, Tone>> = {
  info: "neutral",
  success: "ok",
  warning: "warn",
  critical: "danger",
};

export function AuditSection() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // The request is identified by its own path plus the retry nonce, and the key
  // of the request already on screen is remembered. `loading` is therefore
  // DERIVED during render — "the rows do not belong to the current filters" —
  // instead of set synchronously in the effect body, which cascades renders
  // (react-hooks/set-state-in-effect).
  const auditPath = `/api/audit${qs({ q: debounced, action, entity, from, to, page, pageSize })}`;
  const requestKey = `${auditPath}#${nonce}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<ListResult<AuditEntry>>(auditPath, { signal: controller.signal })
      .then((res) => {
        if (!alive) return;
        setRows(res.items);
        setTotal(res.pagination.total);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError ? err.message : "Audit sa nepodarilo načítať.",
        );
      })
      .finally(() => {
        if (alive) setLoadedKey(requestKey);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [auditPath, requestKey]);

  // Options built from the rows on screen — see the module header.
  const actionOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action).filter(Boolean));
    if (action) set.add(action);
    return [...set].sort().map((v) => ({ value: v, label: v }));
  }, [rows, action]);

  const entityOptions = useMemo(() => {
    const set = new Set(
      rows.map((r) => r.entity).filter((v): v is string => Boolean(v)),
    );
    if (entity) set.add(entity);
    return [...set].sort().map((v) => ({ value: v, label: v }));
  }, [rows, entity]);

  const columns = useMemo<TableColumn<AuditEntry>[]>(
    () => [
      {
        key: "ts",
        header: t("auth.audit.when"),
        width: "170px",
        render: (r) => <span className="tnum">{fmtDateTime(r.ts)}</span>,
      },
      {
        key: "who",
        header: t("auth.audit.who"),
        width: "220px",
        render: (r) => (
          <span className="truncate">{r.userEmail ?? EM_DASH}</span>
        ),
      },
      {
        key: "action",
        header: t("auth.audit.action"),
        width: "190px",
        render: (r) => <code className="au-code">{r.action}</code>,
      },
      {
        key: "entity",
        header: t("auth.audit.entity"),
        width: "170px",
        render: (r) =>
          r.entity ? (
            <span className="au-stack">
              <span className="truncate">{r.entity}</span>
              {r.entityId ? (
                <span className="meta truncate">{r.entityId}</span>
              ) : null}
            </span>
          ) : (
            <span className="muted">{EM_DASH}</span>
          ),
      },
      {
        key: "severity",
        header: t("settings.audit.severity"),
        width: "110px",
        render: (r) =>
          r.severity ? (
            <Badge tone={SEVERITY_TONE[r.severity] ?? "neutral"}>{r.severity}</Badge>
          ) : (
            <span className="muted">{EM_DASH}</span>
          ),
      },
      {
        key: "detail",
        header: t("settings.audit.col.detail"),
        render: (r) => (
          <span className="truncate">{r.detail ?? EM_DASH}</span>
        ),
      },
      {
        key: "ip",
        header: t("settings.audit.col.ip"),
        width: "130px",
        render: (r) => <span className="tnum meta">{r.ip ?? EM_DASH}</span>,
      },
    ],
    [],
  );

  return (
    <Panel>
      <PanelHead
        icon={ScrollText}
        title={t("settings.section.audit")}
        subtitle={t("settings.audit.hint")}
      />
      <PanelBody>
        <Toolbar>
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={t("settings.audit.search")}
            ariaLabel={t("settings.audit.search")}
          />
          <Select
            aria-label={t("settings.audit.filterAction")}
            value={action}
            placeholder={t("settings.audit.allActions")}
            options={actionOptions}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label={t("settings.audit.filterEntity")}
            value={entity}
            placeholder={t("settings.audit.allEntities")}
            options={entityOptions}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
          />
          <Field label={t("settings.audit.filterFrom")} className="au-date">
            <Input
              type="date"
              aria-label={t("settings.audit.filterFrom")}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label={t("settings.audit.filterTo")} className="au-date">
            <Input
              type="date"
              aria-label={t("settings.audit.filterTo")}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <ToolbarSpacer />
        </Toolbar>
      </PanelBody>
      <PanelBody flush>
        {error ? (
          <ErrorState message={error} onRetry={refetch} bare />
        ) : (
          <Table
            className="au-table"
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            loading={loading && rows.length === 0}
            caption={t("settings.section.audit")}
            empty={
              <EmptyState
                bare
                canAct={false}
                tone="muted"
                title={t("auth.audit.empty")}
              />
            }
          />
        )}
      </PanelBody>
      {rows.length > 0 ? (
        <PanelBody>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </PanelBody>
      ) : null}

      <style>{AUDIT_CSS}</style>
    </Panel>
  );
}

const AUDIT_CSS = `
.au-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-xs); color: var(--accent-ink);
}
.au-stack { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.au-date { flex: 0 0 auto; }
.au-date .field-label { margin-bottom: 2px; }
table.au-table { min-width: 1080px; }
`;

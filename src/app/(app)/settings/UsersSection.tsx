"use client";

// Nastavenia → Používatelia (ADMIN ONLY — the section is not rendered at all
// without `users.manage`, never merely disabled).
//
// The three lock-out guards live on the server (last active admin cannot be
// demoted, deactivated or deleted; you cannot delete yourself) and they answer
// 409 with a Slovak sentence. The client shows that sentence verbatim instead of
// duplicating the rule — one implementation, in the place that actually knows the
// current admin count.
//
// Passwords: creating a user requires one, editing takes one only to RESET it (an
// empty field leaves the credential alone). An admin-set password revokes the
// target's sessions server-side; the response says how many, and that is surfaced.

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Plus, Trash2, UserCog } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  Field,
  FieldRow,
  Input,
  Modal,
  Panel,
  PanelBody,
  PanelHead,
  Pagination,
  Select,
  Table,
  Toolbar,
  ToolbarSearch,
  ToolbarSpacer,
  useToast,
} from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import { EmptyState, ErrorState } from "@/components/states";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import { ROLE_LABEL } from "@/components/shellUser";
import { ROLE_KEYS } from "@/lib/auth/rights";
import type { RoleKey } from "@/lib/auth/rights";
import {
  MIN_PASSWORD_LENGTH,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/domain/contracts/auth";
import type { PublicUserDto } from "@/lib/domain/contracts/auth";
import { fmtDateTime } from "@/lib/client/format";
import { t } from "@/lib/i18n";

const SEARCH_DEBOUNCE_MS = 350;

export interface UsersSectionProps {
  /** The signed-in admin — used to hide "delete" on their own row. */
  currentUserId: string | null;
}

export function UsersSection({ currentUserId }: UsersSectionProps) {
  const toast = useToast();

  const [rows, setRows] = useState<PublicUserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // The request path plus the refetch nonce identifies one request; the key of
  // the request whose rows are on screen is remembered, so `loading` is DERIVED
  // during render instead of set synchronously in the effect body (which
  // cascades renders — react-hooks/set-state-in-effect).
  const usersPath = `/api/admin/users${qs({ q: debounced, role, active, page, pageSize })}`;
  const requestKey = `${usersPath}#${nonce}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PublicUserDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicUserDto | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    apiGet<ListResult<PublicUserDto>>(usersPath, { signal: controller.signal })
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
          err instanceof ApiError
            ? err.message
            : "Používateľov sa nepodarilo načítať.",
        );
      })
      .finally(() => {
        if (alive) setLoadedKey(requestKey);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [usersPath, requestKey]);

  const onDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/users/${deleteTarget.id}`);
      toast.success(t("settings.users.deleted"));
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Zmazanie používateľa zlyhalo.",
      );
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, toast, refetch]);

  const columns = useMemo<TableColumn<PublicUserDto>[]>(
    () => [
      {
        key: "name",
        header: t("auth.users.displayName"),
        render: (u) => (
          <span className="row">
            <Avatar size="sm" name={u.displayName} />
            <span className="us-stack">
              <span className="truncate">{u.displayName}</span>
              <span className="meta truncate">{u.email}</span>
            </span>
          </span>
        ),
      },
      {
        key: "role",
        header: t("auth.users.role"),
        width: "130px",
        render: (u) => <Badge tone="accent">{ROLE_LABEL[u.role]}</Badge>,
      },
      {
        key: "active",
        header: t("auth.users.active"),
        width: "120px",
        render: (u) =>
          u.active ? (
            <Badge tone="ok">{t("settings.users.active")}</Badge>
          ) : (
            <Badge tone="warn">{t("settings.users.inactive")}</Badge>
          ),
      },
      {
        key: "lastLogin",
        header: t("auth.users.lastLogin"),
        width: "170px",
        render: (u) =>
          u.lastLogin ? (
            <span className="tnum">{fmtDateTime(u.lastLogin)}</span>
          ) : (
            <span className="muted">{t("auth.users.neverLoggedIn")}</span>
          ),
      },
      {
        key: "actions",
        header: "",
        width: "110px",
        align: "right",
        render: (u) => (
          <span className="row us-actions">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setEditing(u);
                setFormOpen(true);
              }}
            >
              {t("action.edit")}
            </Button>
            {u.id === currentUserId ? null : (
              <Button
                size="xs"
                variant="danger"
                iconOnly
                icon={Trash2}
                aria-label={`${t("auth.users.delete")} — ${u.displayName}`}
                onClick={() => setDeleteTarget(u)}
              />
            )}
          </span>
        ),
      },
    ],
    [currentUserId],
  );

  return (
    <Panel>
      <PanelHead
        icon={UserCog}
        title={t("settings.section.users")}
        subtitle={t("settings.users.hint")}
        actions={
          <Button
            size="sm"
            variant="accent"
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t("auth.users.create")}
          </Button>
        }
      />
      <PanelBody>
        <Toolbar>
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={t("settings.users.search")}
            ariaLabel={t("settings.users.search")}
          />
          <Select
            aria-label={t("auth.users.role")}
            value={role}
            placeholder={t("settings.users.allRoles")}
            options={ROLE_KEYS.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label={t("auth.users.active")}
            value={active}
            placeholder={t("common.all")}
            options={[
              { value: "1", label: t("settings.users.active") },
              { value: "0", label: t("settings.users.inactive") },
            ]}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
          />
          <ToolbarSpacer />
        </Toolbar>
      </PanelBody>
      <PanelBody flush>
        {error ? (
          <ErrorState message={error} onRetry={refetch} bare />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey={(u) => u.id}
            loading={loading && rows.length === 0}
            caption={t("settings.section.users")}
            empty={
              <EmptyState
                bare
                canAct={false}
                tone="muted"
                title={t("settings.users.empty")}
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

      <UserFormModal
        open={formOpen}
        user={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(revokedSessions) => {
          refetch();
          if (revokedSessions > 0) toast.warn(t("settings.users.sessionsRevoked"));
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onDelete()}
        title={t("settings.users.deleteTitle")}
        message={`${deleteTarget?.displayName ?? ""} — ${t("settings.users.deleteWarning")}`}
        confirmLabel={t("action.delete")}
      />

      <style>{USERS_CSS}</style>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Create / edit modal
// ---------------------------------------------------------------------------

function UserFormModal({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: PublicUserDto | null;
  onClose: () => void;
  onSaved: (revokedSessions: number) => void;
}) {
  if (!open) return null;
  return <UserFormBody user={user} onClose={onClose} onSaved={onSaved} />;
}

function UserFormBody({
  user,
  onClose,
  onSaved,
}: {
  user: PublicUserDto | null;
  onClose: () => void;
  onSaved: (revokedSessions: number) => void;
}) {
  const toast = useToast();
  const ids = {
    email: useId(),
    name: useId(),
    role: useId(),
    password: useId(),
    active: useId(),
  };

  const editing = user !== null;
  const [email, setEmail] = useState(user?.email ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [role, setRole] = useState<RoleKey>(user?.role ?? "editor");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(user?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setError(null);

    if (editing) {
      const payload: Record<string, unknown> = { displayName, role, active };
      if (password !== "") payload.password = password;
      const parsed = userUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Skontrolujte zadané údaje.");
        return;
      }
      setBusy(true);
      try {
        const res = await apiPatch<{ revokedSessions: number }>(
          `/api/admin/users/${user.id}`,
          parsed.data,
        );
        toast.success(t("settings.users.updated"));
        onSaved(res.revokedSessions ?? 0);
        onClose();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Uloženie zlyhalo.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const parsed = userCreateSchema.safeParse({
      email,
      displayName,
      role,
      password,
      active,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Skontrolujte zadané údaje.");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/admin/users", parsed.data);
      toast.success(t("settings.users.created"));
      onSaved(0);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Uloženie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      dismissible={!busy}
      title={editing ? t("settings.users.editTitle") : t("settings.users.newTitle")}
      subtitle={editing ? user.email : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("action.cancel")}
          </Button>
          <Button variant="accent" loading={busy} onClick={() => void submit()}>
            {t("action.save")}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <Field label={t("auth.users.email")} htmlFor={ids.email} required>
          <Input
            id={ids.email}
            type="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            // The e-mail is the login identity; changing it would orphan the
            // audit trail, so the API has no field for it either.
            readOnly={editing}
            disabled={editing}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={t("auth.users.displayName")} htmlFor={ids.name} required>
          <Input
            id={ids.name}
            value={displayName}
            autoFocus
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>

        <FieldRow>
          <Field label={t("auth.users.role")} htmlFor={ids.role}>
            <Select
              id={ids.role}
              value={role}
              options={ROLE_KEYS.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              onChange={(e) => setRole(e.target.value as RoleKey)}
            />
          </Field>
          <Field label={t("auth.users.active")} htmlFor={ids.active}>
            <Select
              id={ids.active}
              value={active ? "1" : "0"}
              options={[
                { value: "1", label: t("settings.users.active") },
                { value: "0", label: t("settings.users.inactive") },
              ]}
              onChange={(e) => setActive(e.target.value === "1")}
            />
          </Field>
        </FieldRow>

        <Field
          label={
            editing ? t("settings.users.newPassword") : t("settings.users.password")
          }
          htmlFor={ids.password}
          required={!editing}
          hint={`${t("auth.password.hint")} (min. ${MIN_PASSWORD_LENGTH})`}
        >
          <Input
            id={ids.password}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          {t("action.save")}
        </button>
      </form>
    </Modal>
  );
}

const USERS_CSS = `
.us-stack { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.us-actions { justify-content: flex-end; gap: 2px; }
`;

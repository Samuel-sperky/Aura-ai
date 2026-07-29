"use client";

// Work-item detail: five tabs — Prehľad · Podúlohy · Komentáre · Čas · Závislosti.
//
// WORKLOG IS OPTIONAL (contract §5.2, spec Q33): nothing here requires time to be
// logged, and moving an item to Hotovo never asks for it. The quick +15 / +30 / +60
// buttons exist because a two-click log is the only kind that actually gets used
// (spec Q30).
//
// COMMENT EDITING stamps `edited_at` server-side and is allowed for the author (or
// an admin); the API answers 403 otherwise and that message is shown verbatim.
//
// DEPENDENCIES are the single `blocks` relation in both directions. A cycle is
// rejected by the server (400) — the client does not try to predict it.

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  Field,
  FieldRow,
  Input,
  Modal,
  Pill,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, qs } from "@/lib/api";
import type { ListResult } from "@/lib/api";
import {
  ITEM_TYPE_ICON,
  PRIORITY_TONE,
  WORK_ITEM_STATUS_ORDER,
  WORK_ITEM_STATUS_TONE,
  itemTypeKey,
  statusKey,
} from "@/lib/client/domain";
import {
  EM_DASH,
  dueLabel,
  fmtDate,
  fmtDateTime,
  fmtInt,
  fmtMinutes,
  fmtRollupPoints,
  todayIso,
} from "@/lib/client/format";
import { t } from "@/lib/i18n";
import type {
  DependencyListDto,
  WorkItemCommentDto,
  WorkItemDto,
  WorkItemStatus,
  WorklogDto,
} from "@/lib/domain/contracts/workItems";

type ItemTab = "overview" | "subtasks" | "comments" | "time" | "dependencies";

/** The quick-log buttons from spec Q30. */
const QUICK_MINUTES = [15, 30, 60] as const;

export interface WorkItemDetailModalProps {
  /** Item id from `?item=`; null closes the modal. */
  itemId: string | null;
  onClose: () => void;
  onEdit: (item: WorkItemDto) => void;
  onAddSubtask: (parent: WorkItemDto) => void;
  /** The item changed (status, worklog, delete) — the list refetches. */
  onChanged: (item: WorkItemDto | null) => void;
  canWrite: boolean;
  canComment: boolean;
  canLogTime: boolean;
  /** Candidates for a new dependency: other items of the same project. */
  siblings: ReadonlyArray<WorkItemDto>;
  refreshToken?: number;
}

export function WorkItemDetailModal(props: WorkItemDetailModalProps) {
  if (!props.itemId) return null;
  return <WorkItemDetailBody {...props} itemId={props.itemId} />;
}

function WorkItemDetailBody({
  itemId,
  onClose,
  onEdit,
  onAddSubtask,
  onChanged,
  canWrite,
  canComment,
  canLogTime,
  siblings,
  refreshToken = 0,
}: WorkItemDetailModalProps & { itemId: string }) {
  const toast = useToast();

  const [item, setItem] = useState<WorkItemDto | null>(null);
  const [children, setChildren] = useState<WorkItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ItemTab>("overview");
  const [nonce, setNonce] = useState(0);

  // `loading` is DERIVED: the key of the request whose data is on screen is
  // remembered, so "a request is in flight" is a render-time comparison. Calling
  // setLoading(true) in the effect body cascades renders
  // (react-hooks/set-state-in-effect).
  const requestKey = `${itemId}#${refreshToken}#${nonce}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  const [comments, setComments] = useState<WorkItemCommentDto[] | null>(null);
  const [deps, setDeps] = useState<DependencyListDto | null>(null);
  const [worklogs, setWorklogs] = useState<WorklogDto[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    apiGet<{ workItem: WorkItemDto; children: WorkItemDto[] }>(
      `/api/work-items/${itemId}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!alive) return;
        setItem(data.workItem);
        setChildren(data.children ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError ? err.message : "Položku sa nepodarilo načítať.",
        );
      })
      .finally(() => {
        if (alive) setLoadedKey(requestKey);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [itemId, requestKey]);

  // Lazy per-tab loads (each once per opened item).
  useEffect(() => {
    if (tab === "comments" && comments === null) {
      apiGet<ListResult<WorkItemCommentDto>>(
        `/api/work-items/${itemId}/comment${qs({ pageSize: 200 })}`,
      )
        .then((res) => setComments(res.items))
        .catch(() => setComments([]));
    }
    if (tab === "dependencies" && deps === null) {
      apiGet<DependencyListDto>(`/api/work-items/${itemId}/dependencies`)
        .then(setDeps)
        .catch(() => setDeps({ blocks: [], blockedBy: [] }));
    }
    if (tab === "time" && worklogs === null) {
      apiGet<ListResult<WorklogDto>>(
        `/api/worklogs${qs({ workItemId: itemId, pageSize: 200 })}`,
      )
        .then((res) => setWorklogs(res.items))
        .catch(() => setWorklogs([]));
    }
  }, [tab, itemId, comments, deps, worklogs]);

  const apiError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError) {
        toast.error(err.message);
        if (err.isVersionConflict) reload();
        return;
      }
      toast.error(fallback);
    },
    [toast, reload],
  );

  const onTransition = useCallback(
    async (status: WorkItemStatus) => {
      if (!item) return;
      try {
        const res = await apiPost<{ workItem: WorkItemDto }>(
          `/api/work-items/${item.id}/transition`,
          { version: item.version, status },
        );
        setItem(res.workItem);
        onChanged(res.workItem);
      } catch (err) {
        apiError(err, "Zmena stavu zlyhala.");
      }
    },
    [item, onChanged, apiError],
  );

  const onDelete = useCallback(async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/work-items/${item.id}`, { version: item.version });
      toast.success(t("action.delete"));
      setConfirmDelete(false);
      onChanged(null);
      onClose();
    } catch (err) {
      apiError(err, "Zmazanie zlyhalo.");
    } finally {
      setDeleting(false);
    }
  }, [item, toast, onChanged, onClose, apiError]);

  if (loading && !item) {
    return (
      <Modal open onClose={onClose} title={t("workItems.title")}>
        <LoadingState blocks={2} />
      </Modal>
    );
  }

  if (!item) {
    return (
      <Modal open onClose={onClose} title={t("workItems.title")}>
        <ErrorState message={error ?? "Položka sa nenašla."} bare />
      </Modal>
    );
  }

  const Icon = ITEM_TYPE_ICON[item.itemType];

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={item.title}
        subtitle={[
          item.projectCode ?? "",
          t(itemTypeKey(item.itemType)),
          item.sprintName ?? t("workItems.noSprint"),
        ]
          .filter(Boolean)
          .join(" · ")}
        footer={
          <>
            {canWrite ? (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
              >
                {t("action.delete")}
              </Button>
            ) : null}
            <span className="spacer" />
            <Button variant="ghost" onClick={onClose}>
              {t("action.close")}
            </Button>
            {canWrite ? (
              <Button variant="accent" icon={Pencil} onClick={() => onEdit(item)}>
                {t("action.edit")}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="wd-root">
          <div className="row row-wrap wd-head">
            <span className="wd-type">
              <Icon size={16} aria-hidden="true" />
              <span className="sr-only">{t(itemTypeKey(item.itemType))}</span>
            </span>
            <Pill tone={WORK_ITEM_STATUS_TONE[item.status]}>
              {t(statusKey(item.status))}
            </Pill>
            <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
            <Badge>
              {t("workItems.field.storyPoints")}:{" "}
              {fmtRollupPoints(item.storyPoints, item.childStoryPoints, item.childCount)}
            </Badge>
            <span className="spacer" />
            {canWrite ? (
              <Select
                aria-label={t("workItems.field.status")}
                value={item.status}
                options={WORK_ITEM_STATUS_ORDER.map((s) => ({
                  value: s,
                  label: t(statusKey(s)),
                }))}
                onChange={(e) =>
                  void onTransition(e.target.value as WorkItemStatus)
                }
              />
            ) : null}
          </div>

          <Tabs
            ariaLabel={t("workItems.title")}
            value={tab}
            onChange={setTab}
            items={[
              { value: "overview", label: t("workItems.tab.overview") },
              {
                value: "subtasks",
                label: t("workItems.tab.subtasks"),
                count: item.childCount,
              },
              { value: "comments", label: t("workItems.tab.comments") },
              { value: "time", label: t("workItems.tab.time") },
              { value: "dependencies", label: t("workItems.tab.dependencies") },
            ]}
          />

          {tab === "overview" ? (
            <div
              role="tabpanel"
              id="panel-overview"
              aria-labelledby="tab-overview"
              className="wd-panel"
            >
              {item.description ? (
                <p className="wd-desc">{item.description}</p>
              ) : (
                <p className="muted">{EM_DASH}</p>
              )}
              <dl className="wd-facts">
                <div>
                  <dt>{t("workItems.field.assignee")}</dt>
                  <dd>
                    {item.assigneeName ? (
                      <span className="row">
                        <Avatar
                          size="sm"
                          name={item.assigneeName}
                          initials={item.assigneeInitials ?? undefined}
                        />
                        {item.assigneeName}
                      </span>
                    ) : (
                      <span className="muted">{t("workItems.unassigned")}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t("workItems.field.reporter")}</dt>
                  <dd>{item.reporterName ?? EM_DASH}</dd>
                </div>
                <div>
                  <dt>{t("workItems.field.dueDate")}</dt>
                  <dd className="tnum">
                    {item.dueDate ? (
                      <>
                        {fmtDate(item.dueDate)}{" "}
                        <span className="meta">{dueLabel(item.dueDate)}</span>
                      </>
                    ) : (
                      EM_DASH
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t("workItems.field.loggedTime")}</dt>
                  <dd className="tnum">{fmtMinutes(item.loggedMinutes)}</dd>
                </div>
                <div>
                  <dt>{t("workItems.field.rank")}</dt>
                  <dd className="tnum">{fmtInt(item.rankValue)}</dd>
                </div>
                <div>
                  <dt>{t("projects.field.updatedAt")}</dt>
                  <dd className="tnum">{fmtDateTime(item.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {tab === "subtasks" ? (
            <div
              role="tabpanel"
              id="panel-subtasks"
              aria-labelledby="tab-subtasks"
              className="wd-panel"
            >
              {item.parentId !== null ? (
                <p className="notice notice-accent">
                  <span className="notice-body">{t("workItems.error.depth")}</span>
                </p>
              ) : (
                <div className="row">
                  <span className="spacer" />
                  {canWrite ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Plus}
                      onClick={() => onAddSubtask(item)}
                    >
                      {t("workItems.addSubtask")}
                    </Button>
                  ) : null}
                </div>
              )}
              {children.length === 0 ? (
                <EmptyState
                  bare
                  canAct={false}
                  tone="muted"
                  title={t("workItems.subtasksNone")}
                />
              ) : (
                <ul className="wd-list">
                  {children.map((child) => (
                    <li key={child.id}>
                      <span className="wd-stack">
                        <span className="truncate">{child.title}</span>
                        <span className="meta">
                          {t(statusKey(child.status))} · {child.priority} ·{" "}
                          {fmtInt(child.storyPoints)} SP
                        </span>
                      </span>
                      <Pill tone={WORK_ITEM_STATUS_TONE[child.status]}>
                        {t(statusKey(child.status))}
                      </Pill>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "comments" ? (
            <CommentsTab
              itemId={item.id}
              comments={comments}
              canComment={canComment}
              onChanged={setComments}
              onError={apiError}
            />
          ) : null}

          {tab === "time" ? (
            <TimeTab
              item={item}
              worklogs={worklogs}
              canLogTime={canLogTime}
              onReloadItem={reload}
              onWorklogs={setWorklogs}
              onError={apiError}
            />
          ) : null}

          {tab === "dependencies" ? (
            <DependenciesTab
              itemId={item.id}
              deps={deps}
              siblings={siblings}
              canWrite={canWrite}
              onDeps={setDeps}
              onError={apiError}
            />
          ) : null}
        </div>

        <style>{WORK_ITEM_DETAIL_CSS}</style>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
        title={t("workItems.action.delete")}
        message={t("workItems.delete.confirm")}
        confirmLabel={t("action.delete")}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

type ErrorReporter = (err: unknown, fallback: string) => void;

function CommentsTab({
  itemId,
  comments,
  canComment,
  onChanged,
  onError,
}: {
  itemId: string;
  comments: WorkItemCommentDto[] | null;
  canComment: boolean;
  onChanged: (rows: WorkItemCommentDto[]) => void;
  onError: ErrorReporter;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  async function submit(): Promise<void> {
    if (draft.trim() === "") return;
    setBusy(true);
    try {
      const res = await apiPost<{ comment: WorkItemCommentDto }>(
        `/api/work-items/${itemId}/comment`,
        { body: draft },
      );
      onChanged([...(comments ?? []), res.comment]);
      setDraft("");
    } catch (err) {
      onError(err, "Komentár sa nepodarilo uložiť.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(commentId: string): Promise<void> {
    setBusy(true);
    try {
      const res = await apiPatch<{ comment: WorkItemCommentDto }>(
        `/api/work-items/${itemId}/comment`,
        { commentId, body: editDraft },
      );
      onChanged(
        (comments ?? []).map((c) => (c.id === commentId ? res.comment : c)),
      );
      setEditingId(null);
    } catch (err) {
      onError(err, "Komentár sa nepodarilo upraviť.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="tabpanel"
      id="panel-comments"
      aria-labelledby="tab-comments"
      className="wd-panel"
    >
      {comments === null ? (
        <LoadingState blocks={1} />
      ) : comments.length === 0 ? (
        <EmptyState
          bare
          canAct={false}
          tone="muted"
          icon={MessageSquare}
          title={t("comments.empty")}
        />
      ) : (
        <ul className="wd-comments">
          {comments.map((c) => (
            <li key={c.id}>
              <div className="row">
                <Avatar
                  size="sm"
                  name={c.authorName ?? "?"}
                  initials={c.authorInitials ?? undefined}
                />
                <span className="wd-comment-author">{c.authorName ?? EM_DASH}</span>
                <span className="meta">{fmtDateTime(c.createdAt)}</span>
                {c.editedAt ? (
                  <span className="meta">· {t("comments.edited")}</span>
                ) : null}
                <span className="spacer" />
                {canComment ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    iconOnly
                    icon={Pencil}
                    aria-label={t("comments.edit")}
                    onClick={() => {
                      setEditingId(c.id);
                      setEditDraft(c.body);
                    }}
                  />
                ) : null}
              </div>
              {editingId === c.id ? (
                <div className="wd-comment-edit">
                  <Textarea
                    value={editDraft}
                    rows={3}
                    aria-label={t("comments.edit")}
                    onChange={(e) => setEditDraft(e.target.value)}
                  />
                  <div className="row">
                    <span className="spacer" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      {t("action.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      variant="accent"
                      icon={Check}
                      loading={busy}
                      onClick={() => void saveEdit(c.id)}
                    >
                      {t("action.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="wd-comment-body">{c.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <Field label={t("comments.title")} htmlFor={inputId}>
          <Textarea
            id={inputId}
            value={draft}
            rows={3}
            placeholder={t("comments.placeholder")}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row wd-comment-actions">
            <span className="spacer" />
            <Button
              variant="accent"
              loading={busy}
              disabled={draft.trim() === ""}
              onClick={() => void submit()}
            >
              {t("comments.submit")}
            </Button>
          </div>
        </Field>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Worklog
// ---------------------------------------------------------------------------

function TimeTab({
  item,
  worklogs,
  canLogTime,
  onReloadItem,
  onWorklogs,
  onError,
}: {
  item: WorkItemDto;
  worklogs: WorklogDto[] | null;
  canLogTime: boolean;
  onReloadItem: () => void;
  onWorklogs: (rows: WorklogDto[]) => void;
  onError: ErrorReporter;
}) {
  const ids = { date: useId(), minutes: useId(), note: useId() };
  const [workDate, setWorkDate] = useState(() => todayIso());
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => (worklogs ?? []).reduce((sum, w) => sum + w.minutes, 0),
    [worklogs],
  );

  async function log(value: number, description = note): Promise<void> {
    setBusy(true);
    try {
      const res = await apiPost<{ worklog: WorklogDto; loggedMinutes: number }>(
        "/api/worklogs",
        {
          workItemId: item.id,
          minutes: value,
          workDate,
          description: description.trim() === "" ? undefined : description,
        },
      );
      onWorklogs([res.worklog, ...(worklogs ?? [])]);
      setNote("");
      onReloadItem();
    } catch (err) {
      onError(err, "Záznam času sa nepodarilo uložiť.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    setBusy(true);
    try {
      await apiDelete(`/api/worklogs${qs({ id })}`);
      onWorklogs((worklogs ?? []).filter((w) => w.id !== id));
      onReloadItem();
    } catch (err) {
      onError(err, "Záznam času sa nepodarilo zmazať.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="tabpanel"
      id="panel-time"
      aria-labelledby="tab-time"
      className="wd-panel"
    >
      <p className="notice">
        <span className="notice-body">{t("worklogs.optionalHint")}</span>
      </p>

      {canLogTime ? (
        <>
          <FieldRow>
            <Field label={t("worklogs.field.date")} htmlFor={ids.date}>
              <Input
                id={ids.date}
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
            </Field>
            <Field label={t("worklogs.field.minutes")} htmlFor={ids.minutes}>
              <Input
                id={ids.minutes}
                type="number"
                min={1}
                max={1440}
                step={5}
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </Field>
          </FieldRow>
          <Field label={t("worklogs.field.description")} htmlFor={ids.note}>
            <Input
              id={ids.note}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <div className="row row-wrap">
            {QUICK_MINUTES.map((q) => (
              <Button
                key={q}
                size="sm"
                variant="outline"
                loading={busy}
                onClick={() => void log(q)}
              >
                {t(`worklogs.quick${q}`)}
              </Button>
            ))}
            <span className="spacer" />
            <Button
              variant="accent"
              icon={Plus}
              loading={busy}
              onClick={() => void log(Number(minutes || 0))}
            >
              {t("worklogs.add")}
            </Button>
          </div>
        </>
      ) : null}

      <div className="row">
        <span className="eyebrow">{t("worklogs.title")}</span>
        <span className="spacer" />
        <span className="tnum">
          {t("worklogs.total")}: {fmtMinutes(total)}
        </span>
      </div>

      {worklogs === null ? (
        <LoadingState blocks={1} />
      ) : worklogs.length === 0 ? (
        <EmptyState bare canAct={false} tone="muted" title={t("worklogs.empty")} />
      ) : (
        <ul className="wd-list">
          {worklogs.map((w) => (
            <li key={w.id}>
              <span className="wd-stack">
                <span className="tnum">
                  {fmtDate(w.workDate)} · {fmtMinutes(w.minutes)}
                </span>
                <span className="meta">
                  {w.userName ?? EM_DASH}
                  {w.description ? ` · ${w.description}` : ""}
                </span>
              </span>
              {canLogTime ? (
                <Button
                  size="xs"
                  variant="ghost"
                  iconOnly
                  icon={Trash2}
                  aria-label={`${t("worklogs.delete")} — ${fmtDate(w.workDate)}`}
                  onClick={() => void remove(w.id)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

function DependenciesTab({
  itemId,
  deps,
  siblings,
  canWrite,
  onDeps,
  onError,
}: {
  itemId: string;
  deps: DependencyListDto | null;
  siblings: ReadonlyArray<WorkItemDto>;
  canWrite: boolean;
  onDeps: (deps: DependencyListDto) => void;
  onError: ErrorReporter;
}) {
  const ids = { target: useId(), direction: useId() };
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"blocks" | "blocked_by">("blocks");
  const [busy, setBusy] = useState(false);

  const options = useMemo(
    () =>
      siblings
        .filter((s) => s.id !== itemId)
        .map((s) => ({ value: s.id, label: s.title })),
    [siblings, itemId],
  );

  async function add(): Promise<void> {
    if (target === "") return;
    setBusy(true);
    try {
      const res = await apiPost<DependencyListDto>(
        `/api/work-items/${itemId}/dependencies`,
        { targetId: target, direction },
      );
      onDeps(res);
      setTarget("");
    } catch (err) {
      onError(err, "Závislosť sa nepodarilo pridať.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    otherId: string,
    side: "blocks" | "blocked_by",
  ): Promise<void> {
    setBusy(true);
    try {
      const res = await apiDelete<DependencyListDto>(
        `/api/work-items/${itemId}/dependencies${qs(
          side === "blocks" ? { targetId: otherId } : { sourceId: otherId },
        )}`,
      );
      onDeps(res);
    } catch (err) {
      onError(err, "Závislosť sa nepodarilo zmazať.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="tabpanel"
      id="panel-dependencies"
      aria-labelledby="tab-dependencies"
      className="wd-panel"
    >
      {canWrite ? (
        <FieldRow>
          <Field label={t("dependencies.add")} htmlFor={ids.target}>
            <Select
              id={ids.target}
              value={target}
              placeholder={EM_DASH}
              options={options}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
          <Field label={t("dependencies.title")} htmlFor={ids.direction}>
            <div className="row">
              <Select
                id={ids.direction}
                value={direction}
                options={[
                  { value: "blocks", label: t("dependencies.blocks") },
                  { value: "blocked_by", label: t("dependencies.blockedBy") },
                ]}
                onChange={(e) =>
                  setDirection(
                    e.target.value === "blocked_by" ? "blocked_by" : "blocks",
                  )
                }
              />
              <Button
                variant="accent"
                icon={Plus}
                loading={busy}
                disabled={target === ""}
                onClick={() => void add()}
              >
                {t("dependencies.add")}
              </Button>
            </div>
          </Field>
        </FieldRow>
      ) : null}

      {deps === null ? (
        <LoadingState blocks={1} />
      ) : deps.blocks.length === 0 && deps.blockedBy.length === 0 ? (
        <EmptyState
          bare
          canAct={false}
          tone="muted"
          icon={Link2}
          title={t("dependencies.empty")}
        />
      ) : (
        <>
          <DependencyGroup
            title={t("dependencies.blocks")}
            rows={deps.blocks}
            canWrite={canWrite}
            onRemove={(id) => void remove(id, "blocks")}
          />
          <DependencyGroup
            title={t("dependencies.blockedBy")}
            rows={deps.blockedBy}
            canWrite={canWrite}
            onRemove={(id) => void remove(id, "blocked_by")}
          />
        </>
      )}
    </div>
  );
}

function DependencyGroup({
  title,
  rows,
  canWrite,
  onRemove,
}: {
  title: string;
  rows: ReadonlyArray<{ id: string; title: string; status: WorkItemStatus }>;
  canWrite: boolean;
  onRemove: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="wd-dep-group">
      <span className="eyebrow">
        <ArrowRight size={12} aria-hidden="true" /> {title}
      </span>
      <ul className="wd-list">
        {rows.map((row) => (
          <li key={row.id}>
            <span className="wd-stack">
              <span className="truncate">{row.title}</span>
              <span className="meta">{t(statusKey(row.status))}</span>
            </span>
            {canWrite ? (
              <Button
                size="xs"
                variant="ghost"
                iconOnly
                icon={Trash2}
                aria-label={`${t("dependencies.remove")} — ${row.title}`}
                onClick={() => onRemove(row.id)}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const WORK_ITEM_DETAIL_CSS = `
.wd-root { display: flex; flex-direction: column; gap: var(--space-4); }
.wd-panel { display: flex; flex-direction: column; gap: var(--space-4); }
.wd-head { gap: var(--space-2); }
.wd-type { display: inline-flex; color: var(--accent-ink); }
.wd-desc { color: var(--ink2); white-space: pre-wrap; max-width: 72ch; }
.wd-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
.wd-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); }
.wd-facts > * { min-width: 0; }
.wd-facts dt {
  margin-bottom: 4px; font-size: var(--text-xs); font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.wd-list { list-style: none; display: flex; flex-direction: column; }
.wd-list li {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) 0; border-bottom: 1px solid var(--border-soft);
}
.wd-list li:last-child { border-bottom: 0; }
.wd-comments { list-style: none; display: flex; flex-direction: column; gap: var(--space-4); }
.wd-comment-author { font-weight: 600; }
.wd-comment-body { margin-top: 5px; color: var(--ink2); white-space: pre-wrap; }
.wd-comment-edit { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2); }
.wd-comment-actions { margin-top: var(--space-2); }
.wd-dep-group { display: flex; flex-direction: column; gap: var(--space-2); }
.wd-dep-group .eyebrow { display: inline-flex; align-items: center; gap: 4px; }
`;

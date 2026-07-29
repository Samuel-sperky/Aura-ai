"use client";

// Checkpoint detail modal (spec Q38): FOUR tabs — Prehľad · Podmienky ·
// Rozhodnutie · Aktivita. Centred, focus-trapped, fullscreen under 700 px (all of
// that comes from A7's `Modal`). Deep-linked through `?checkpoint=<id>`.
//
// THE RULE THIS SCREEN EXISTS TO ENFORCE (spec Q34):
//   "Rozhodnúť" is disabled below 100 % readiness and says WHY. A holder of
//   `readiness.override` (admin-only) can unlock it, but only with a written
//   reason that lands in `audit_log`. The server re-checks every one of these
//   rules — the UI only refuses to send a request it knows will fail.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  Flag,
  History,
  ListChecks,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { ApiError, apiGet, apiPost, apiPut } from "@/lib/api";
import type {
  CheckpointDto,
  DecisionDto,
  DecisionOutcome,
  RequirementDto,
} from "@/lib/domain/contracts/checkpoints";
import { DECISION_OUTCOMES, FULL_READINESS } from "@/lib/domain/contracts/checkpoints";
import { formatDay } from "@/lib/timeline";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  ProgressBar,
  Select,
  Tabs,
  Textarea,
  cx,
  healthTone,
  useToast,
  type TabItem,
} from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { t, tk } from "./text";
import styles from "./timeline.module.css";

type Tab = "overview" | "requirements" | "decision" | "activity";

interface DetailResponse {
  checkpoint: CheckpointDto;
  requirements: RequirementDto[];
  decisions: DecisionDto[];
}

/** One-line hint under each outcome button, so the four options are not a quiz. */
const OUTCOME_HINT: Record<DecisionOutcome, string> = {
  go: "Pokračovať podľa plánu.",
  conditional_go: "Pokračovať s povinnou follow-up úlohou.",
  no_go: "Zastaviť plánovanú zmenu.",
  deferred: "Vrátiť checkpoint do prípravy.",
};

const OUTCOME_ICON: Record<DecisionOutcome, typeof CheckCircle2> = {
  go: CheckCircle2,
  conditional_go: Flag,
  no_go: XCircle,
  deferred: Clock3,
};

export interface CheckpointModalProps {
  /** `null` closes the modal (the `?checkpoint=` param is the source of truth). */
  checkpointId: string | null;
  onClose: () => void;
  /** Rights of the signed-in user, from GET /api/auth/me. UX gating only. */
  canWriteCheckpoints: boolean;
  canDecide: boolean;
  canOverrideReadiness: boolean;
  /** Called after any successful mutation so the axis picks up the new state. */
  onChanged: () => void;
}

/**
 * Mounts the body only while a checkpoint is selected and KEYED BY ID, so every
 * open starts from a blank decision form. A leftover outcome or override reason
 * from the previously viewed checkpoint would be a real hazard on this screen,
 * and a reset effect is one forgotten field away from leaking one.
 */
export function CheckpointModal(props: CheckpointModalProps) {
  if (!props.checkpointId) return null;
  return <CheckpointModalBody key={props.checkpointId} {...props} />;
}

function CheckpointModalBody({
  checkpointId,
  onClose,
  canWriteCheckpoints,
  canDecide,
  canOverrideReadiness,
  onChanged,
}: CheckpointModalProps) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Decision form
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);
  const [note, setNote] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [followUpPriority, setFollowUpPriority] = useState<"P1" | "P2" | "P3">("P1");
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const load = useCallback(async (id: string) => {
    try {
      const res = await apiGet<DetailResponse>(
        `/api/checkpoints/${encodeURIComponent(id)}`,
      );
      setData(res);
      setError(null);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : t("timeline.error.load"));
    }
  }, []);

  useEffect(() => {
    if (!checkpointId) return;
    void load(checkpointId);
  }, [checkpointId, load]);

  const cp = data?.checkpoint ?? null;
  const requirements = data?.requirements ?? [];
  const decisions = data?.decisions ?? [];
  const current = decisions.find((d) => d.supersededBy === null) ?? null;
  const superseded = decisions.filter((d) => d.supersededBy !== null);

  const ready = (cp?.readiness ?? 0) >= FULL_READINESS;
  const decided = cp?.lifecycle === "decided";
  const overrideActive = override && canOverrideReadiness && !ready;
  const overrideReasonOk = overrideReason.trim().length >= 10;
  const followUpOk = outcome !== "conditional_go" || followUpTitle.trim().length >= 3;

  /** Why the decide button is disabled, in one Slovak sentence. */
  const blockedReason = useMemo(() => {
    if (!cp) return null;
    if (decided) return t("checkpointModal.noDecision");
    if (!canDecide) return cp.decisionBlockedReason ?? t("state.forbiddenDesc");
    if (cp.decisionBlockedReason) return cp.decisionBlockedReason;
    if (!ready && !overrideActive) return t("checkpointModal.decideLocked");
    if (overrideActive && !overrideReasonOk) return t("checkpointModal.overrideHint");
    if (!outcome) return t("checkpointModal.outcome");
    if (!followUpOk) return t("checkpointModal.followUpHint");
    return null;
  }, [
    cp,
    decided,
    canDecide,
    ready,
    overrideActive,
    overrideReasonOk,
    outcome,
    followUpOk,
  ]);

  /** Uniform mutation wrapper: 409 shows the SERVER message and refetches. */
  async function run(action: () => Promise<void>) {
    if (!checkpointId) return;
    setBusy(true);
    try {
      await action();
      await load(checkpointId);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.isVersionConflict) {
        toast.warn(err.message);
        await load(checkpointId);
        onChanged();
      } else {
        toast.error(err instanceof Error ? err.message : t("timeline.error.load"));
      }
    } finally {
      setBusy(false);
    }
  }

  /** Toggle one checklist row. The endpoint is a full REPLACE, so send them all. */
  function toggleRequirement(row: RequirementDto) {
    if (!cp) return;
    void run(async () => {
      await apiPut(`/api/checkpoints/${encodeURIComponent(cp.id)}/requirements`, {
        version: cp.version,
        requirements: requirements.map((r) => ({
          id: r.id,
          label: r.label,
          required: r.required,
          complete: r.id === row.id ? !r.complete : r.complete,
        })),
      });
      toast.success(t("checkpointModal.requirementsSaved"));
    });
  }

  function submitDecision() {
    if (!cp || !outcome) return;
    void run(async () => {
      await apiPost(`/api/checkpoints/${encodeURIComponent(cp.id)}/decide`, {
        version: cp.version,
        outcome,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(outcome === "conditional_go"
          ? {
              followUpTitle: followUpTitle.trim(),
              followUpPriority,
              ...(followUpDueDate ? { followUpDueDate } : {}),
            }
          : {}),
        ...(overrideActive ? { overrideReason: overrideReason.trim() } : {}),
      });
      toast.success(t("checkpointModal.decided"));
      setTab("activity");
    });
  }

  if (!checkpointId) return null;

  const tabs: ReadonlyArray<TabItem<Tab>> = [
    { value: "overview", label: t("checkpointModal.tab.overview"), icon: Target },
    {
      value: "requirements",
      label: t("checkpointModal.tab.requirements"),
      icon: ListChecks,
      count: requirements.length,
    },
    { value: "decision", label: t("checkpointModal.tab.decision"), icon: ShieldCheck },
    {
      value: "activity",
      label: t("checkpointModal.tab.activity"),
      icon: History,
      count: superseded.length,
    },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      dismissible={!busy}
      title={cp?.name ?? t("state.loading")}
      subtitle={
        cp
          ? `${cp.projectCode} · ${tk("checkpointType", cp.checkpointType)} · ${tk(
              "checkpointState",
              cp.lifecycle,
            )}`
          : undefined
      }
      footer={
        <>
          <span className="meta spacer">
            {cp ? `v${cp.version} · ${t("checkpointModal.activityHint")}` : ""}
          </span>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("action.close")}
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={() => void load(checkpointId)} />
      ) : !cp ? (
        <LoadingState kpis={0} blocks={2} />
      ) : (
        <>
          <div className={styles.cpHero}>
            <div className={styles.cpHeroMain}>
              <p>{cp.description || t("checkpointModal.noDescription")}</p>
              <div className={styles.cpFacts}>
                <span className={styles.cpFact}>
                  {t("checkpointModal.owner")}:{" "}
                  <strong>{cp.ownerName ?? t("common.unassigned")}</strong>
                </span>
                <span className={styles.cpFact}>
                  <ShieldCheck size={12} aria-hidden="true" />
                  {t("checkpointModal.approver")}:{" "}
                  <strong>{cp.approverName ?? t("common.unassigned")}</strong>
                </span>
                <span className={styles.cpFact}>
                  <Clock3 size={12} aria-hidden="true" />
                  {t("checkpointModal.due")}: <strong>{formatDay(cp.dueDate)}</strong>
                </span>
                {cp.overdue ? (
                  <Badge tone="danger">
                    <AlertTriangle size={12} aria-hidden="true" />
                    {t("timeline.queue.overdue")}
                  </Badge>
                ) : null}
              </div>
              <Link
                className="btn btn-outline btn-xs"
                href={`/projects?project=${encodeURIComponent(cp.projectId)}`}
              >
                {t("checkpointModal.openProject")}
                <ExternalLink size={12} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.cpReadiness}>
              <span className="eyebrow">{t("checkpointModal.readiness")}</span>
              <span className={styles.cpReadinessValue}>{cp.readiness} %</span>
              <ProgressBar
                value={cp.readiness}
                tone={healthTone(cp.readiness)}
                label={`${t("checkpointModal.readiness")} ${cp.readiness} %`}
              />
              <span className="meta tnum">
                {cp.requiredCompleteCount} {t("checkpointModal.readinessOf")}{" "}
                {cp.requiredCount}
              </span>
            </div>
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            items={tabs}
            ariaLabel={t("checkpointModal.tabsLabel")}
          />

          {tab === "overview" ? (
            <div
              className={styles.cpTabPanel}
              role="tabpanel"
              id="panel-overview"
              aria-labelledby="tab-overview"
            >
              <div>
                <span className="eyebrow">{t("checkpointModal.impact")}</span>
                <p>{cp.impact || t("checkpointModal.noImpact")}</p>
              </div>
              <div className="row row-wrap">
                <Badge tone="neutral">{tk("checkpointType", cp.checkpointType)}</Badge>
                <Badge tone={cp.lifecycle === "blocked" ? "danger" : "neutral"}>
                  {tk("checkpointState", cp.lifecycle)}
                </Badge>
                {current ? (
                  <Badge tone={current.outcome === "no_go" ? "danger" : "ok"}>
                    {tk("outcome", current.outcome)}
                  </Badge>
                ) : null}
                {cp.startDate || cp.endDate ? (
                  <span className="meta">
                    {formatDay(cp.startDate)} – {formatDay(cp.endDate)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === "requirements" ? (
            <div
              className={styles.cpTabPanel}
              role="tabpanel"
              id="panel-requirements"
              aria-labelledby="tab-requirements"
            >
              {requirements.length === 0 ? (
                <p className="muted">{t("checkpointModal.requirementsEmpty")}</p>
              ) : (
                <ul className={styles.reqList}>
                  {requirements.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={styles.reqRow}
                        disabled={!canWriteCheckpoints || decided || busy}
                        aria-pressed={row.complete}
                        onClick={() => toggleRequirement(row)}
                      >
                        <span
                          className={cx(
                            styles.reqMark,
                            row.complete && styles.reqMarkDone,
                          )}
                          aria-hidden="true"
                        >
                          {row.complete ? (
                            <Check size={13} aria-hidden="true" />
                          ) : (
                            <Circle size={13} aria-hidden="true" />
                          )}
                        </span>
                        <span className={styles.reqMain}>
                          <span className={styles.reqLabel}>{row.label}</span>
                          <span className="meta">
                            {row.required
                              ? t("checkpointModal.requirementsRequired")
                              : t("checkpointModal.requirementsOptional")}
                          </span>
                        </span>
                        <Badge tone={row.complete ? "ok" : "neutral"}>
                          {row.complete
                            ? t("checkpointModal.requirementsDone")
                            : t("checkpointModal.requirementsMissing")}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "decision" ? (
            <div
              className={styles.cpTabPanel}
              role="tabpanel"
              id="panel-decision"
              aria-labelledby="tab-decision"
            >
              <p
                className={cx(
                  "notice",
                  ready ? "notice-accent" : "notice-warn",
                )}
                role={ready ? undefined : "status"}
              >
                {ready ? (
                  <CheckCircle2 size={16} aria-hidden="true" />
                ) : (
                  <XCircle size={16} aria-hidden="true" />
                )}
                <span className="notice-body">
                  {ready
                    ? t("checkpointModal.decideReady")
                    : t("checkpointModal.decideLocked")}
                </span>
              </p>

              {current ? (
                <div className={styles.trailRow}>
                  <strong>{tk("outcome", current.outcome)}</strong>
                  <span className={styles.trailMeta}>
                    {t("checkpointModal.decidedBy")}:{" "}
                    {current.decidedByName ?? t("common.noValue")} ·{" "}
                    {t("checkpointModal.decidedAt")}:{" "}
                    {current.decidedAt ? formatDay(current.decidedAt.slice(0, 10)) : "—"}
                  </span>
                  {current.note ? <p>{current.note}</p> : null}
                </div>
              ) : null}

              {!decided ? (
                <>
                  <span className="eyebrow">{t("checkpointModal.outcome")}</span>
                  <div className={styles.decisionGrid}>
                    {DECISION_OUTCOMES.map((value) => {
                      const Icon = OUTCOME_ICON[value];
                      return (
                        <button
                          key={value}
                          type="button"
                          className={cx(
                            styles.outcomeBtn,
                            outcome === value && styles.outcomeBtnOn,
                          )}
                          aria-pressed={outcome === value}
                          disabled={!canDecide || busy}
                          onClick={() => setOutcome(value)}
                        >
                          <span className={styles.outcomeName}>
                            <Icon size={14} aria-hidden="true" />
                            {tk("outcome", value)}
                          </span>
                          <span className={styles.outcomeHint}>{OUTCOME_HINT[value]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Field label={t("checkpointModal.note")} htmlFor="cp-note">
                    <Textarea
                      id="cp-note"
                      value={note}
                      maxLength={1500}
                      disabled={!canDecide || busy}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </Field>

                  {outcome === "conditional_go" ? (
                    <>
                      <Field
                        label={t("checkpointModal.followUpTitle")}
                        htmlFor="cp-followup"
                        required
                        hint={t("checkpointModal.followUpHint")}
                        error={
                          followUpTitle.length > 0 && followUpTitle.trim().length < 3
                            ? t("checkpointModal.followUpHint")
                            : undefined
                        }
                      >
                        <Input
                          id="cp-followup"
                          value={followUpTitle}
                          maxLength={255}
                          invalid={
                            followUpTitle.length > 0 && followUpTitle.trim().length < 3
                          }
                          disabled={busy}
                          onChange={(event) => setFollowUpTitle(event.target.value)}
                        />
                      </Field>
                      <div className="field-row">
                        <Field
                          label={t("checkpointModal.followUpDue")}
                          htmlFor="cp-followup-due"
                        >
                          <Input
                            id="cp-followup-due"
                            type="date"
                            value={followUpDueDate}
                            disabled={busy}
                            onChange={(event) => setFollowUpDueDate(event.target.value)}
                          />
                        </Field>
                        <Field
                          label={t("checkpointModal.followUpPriority")}
                          htmlFor="cp-followup-priority"
                        >
                          <Select
                            id="cp-followup-priority"
                            value={followUpPriority}
                            disabled={busy}
                            onChange={(event) =>
                              setFollowUpPriority(event.target.value as "P1" | "P2" | "P3")
                            }
                            options={[
                              { value: "P1", label: tk("priority", "P1") },
                              { value: "P2", label: tk("priority", "P2") },
                              { value: "P3", label: tk("priority", "P3") },
                            ]}
                          />
                        </Field>
                      </div>
                    </>
                  ) : null}

                  {!ready && canOverrideReadiness ? (
                    <div className="notice notice-warn">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <div className="notice-body">
                        <label className="row">
                          <input
                            type="checkbox"
                            checked={override}
                            disabled={busy}
                            onChange={(event) => setOverride(event.target.checked)}
                          />
                          {t("checkpointModal.override")}
                        </label>
                        {override ? (
                          <Field
                            label={t("checkpointModal.overrideReason")}
                            htmlFor="cp-override"
                            required
                            hint={t("checkpointModal.overrideHint")}
                          >
                            <Textarea
                              id="cp-override"
                              value={overrideReason}
                              maxLength={500}
                              invalid={overrideReason.length > 0 && !overrideReasonOk}
                              disabled={busy}
                              onChange={(event) => setOverrideReason(event.target.value)}
                            />
                          </Field>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="row row-wrap">
                    <Button
                      variant="accent"
                      icon={ShieldCheck}
                      loading={busy}
                      disabled={blockedReason !== null}
                      // The reason is on the button itself, so a disabled control
                      // still explains itself without a hover-only tooltip.
                      title={blockedReason ?? undefined}
                      onClick={submitDecision}
                    >
                      {t("checkpointModal.decide")}
                    </Button>
                    {blockedReason ? (
                      <span className="meta" role="status">
                        {blockedReason}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "activity" ? (
            <div
              className={styles.cpTabPanel}
              role="tabpanel"
              id="panel-activity"
              aria-labelledby="tab-activity"
            >
              <p className="meta">{t("checkpointModal.activityHint")}</p>
              {superseded.length === 0 ? (
                <p className="muted">{t("checkpointModal.activityEmpty")}</p>
              ) : (
                <ul className={styles.trail}>
                  {superseded.map((decision) => (
                    <li key={decision.id} className={cx(styles.trailRow, styles.trailSuperseded)}>
                      <strong>{tk("outcome", decision.outcome)}</strong>
                      <span className={styles.trailMeta}>
                        {t("checkpointModal.superseded")} ·{" "}
                        {decision.decidedByName ?? t("common.noValue")} ·{" "}
                        {decision.decidedAt
                          ? formatDay(decision.decidedAt.slice(0, 10))
                          : "—"}
                      </span>
                      {decision.note ? <p>{decision.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}
    </Modal>
  );
}

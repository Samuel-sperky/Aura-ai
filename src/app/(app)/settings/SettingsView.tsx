"use client";

// `/settings` — five sections (spec Q42): Vzhľad · Účet · Používatelia · Audit ·
// Zálohy.
//
// A SECTION THE USER MAY NOT SEE IS NOT RENDERED AT ALL — not disabled, not greyed
// out. A disabled "Používatelia" tab still tells a viewer the feature exists and
// invites them to ask why it is off; omitting it is both honest and quieter. The
// gating is UX only: `/api/admin/*`, `/api/audit` and `/api/backups` each re-check
// the right server-side.
//
// The chosen section lives in `?section=`, so a deep link into Audit works and the
// Back button leaves the screen instead of cycling sections.

import { useMemo } from "react";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { HardDrive, ScrollText, Settings2, ShieldCheck, Sun, UserCog } from "lucide-react";
import { PageHeader, Tabs } from "@/components/ui";
import type { TabItem } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { useMe } from "@/lib/client/useMe";
import { t } from "@/lib/i18n";
import { AccountSection } from "./AccountSection";
import { AppearanceSection } from "./AppearanceSection";
import { AuditSection } from "./AuditSection";
import { BackupsSection } from "./BackupsSection";
import { UsersSection } from "./UsersSection";

const SECTIONS = ["appearance", "account", "users", "audit", "backups"] as const;
type Section = (typeof SECTIONS)[number];

export function SettingsView() {
  const me = useMe();
  const [params, setParams] = useQueryStates(
    { section: parseAsStringLiteral(SECTIONS).withDefault("appearance") },
    { history: "replace", clearOnDefault: true },
  );

  const canManageUsers = me.can("users.manage");
  const canReadAudit = me.can("audit.read");
  const canReadBackups = me.can("backup.read");

  const items = useMemo<TabItem<Section>[]>(() => {
    const list: TabItem<Section>[] = [
      { value: "appearance", label: t("settings.section.appearance"), icon: Sun },
      { value: "account", label: t("settings.section.account"), icon: ShieldCheck },
    ];
    if (canManageUsers) {
      list.push({ value: "users", label: t("settings.section.users"), icon: UserCog });
    }
    if (canReadAudit) {
      list.push({ value: "audit", label: t("settings.section.audit"), icon: ScrollText });
    }
    if (canReadBackups) {
      list.push({
        value: "backups",
        label: t("settings.section.backups"),
        icon: HardDrive,
      });
    }
    return list;
  }, [canManageUsers, canReadAudit, canReadBackups]);

  // A link to a section this user cannot see falls back to the first one they can,
  // rather than rendering an empty screen.
  const section: Section = items.some((i) => i.value === params.section)
    ? params.section
    : "appearance";

  if (me.loading) {
    return <LoadingState label={t("state.loading")} blocks={2} />;
  }

  if (me.error) {
    return <ErrorState message={me.error} onRetry={me.reload} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("settings.title")}
        description={t("settings.subtitle")}
        icon={Settings2}
      />

      <Tabs
        ariaLabel={t("settings.title")}
        value={section}
        onChange={(next) => void setParams({ section: next })}
        items={items}
      />

      <div
        role="tabpanel"
        id={`panel-${section}`}
        aria-labelledby={`tab-${section}`}
        className="page-stack"
      >
        {section === "appearance" ? <AppearanceSection /> : null}
        {section === "account" ? <AccountSection user={me.user} /> : null}
        {section === "users" && canManageUsers ? (
          <UsersSection currentUserId={me.user?.id ?? null} />
        ) : null}
        {section === "audit" && canReadAudit ? <AuditSection /> : null}
        {section === "backups" && canReadBackups ? <BackupsSection /> : null}
      </div>
    </div>
  );
}

import {
  CalendarRange,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  ListChecks,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  /** i18n key (see src/lib/i18n/keys.common.ts). */
  labelKey: string;
  /** Slovak fallback so the shell renders correctly before i18n is wired. */
  label: string;
  icon: LucideIcon;
  /**
   * Right required to SEE the item. Undefined = visible to every signed-in role
   * (all six routes are readable by Prehliadač; write actions are gated inside
   * the pages, not in the navigation).
   */
  requiredRight?: string;
}

/**
 * The navigation. EXACTLY six items — this is a contract, not a starting point.
 * Adding a seventh route means changing the contract first.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "nav.overview", label: "Prehľad", icon: LayoutDashboard },
  { href: "/timeline", labelKey: "nav.timeline", label: "Timeline", icon: CalendarRange },
  { href: "/projects", labelKey: "nav.projects", label: "Projekty", icon: FolderKanban },
  { href: "/work-items", labelKey: "nav.workItems", label: "Úlohy", icon: ListChecks },
  { href: "/decisions", labelKey: "nav.decisions", label: "Rozhodnutia", icon: Gavel },
  { href: "/settings", labelKey: "nav.settings", label: "Nastavenia", icon: Settings },
] as const;

/** Items the given rights may see. Admin sees everything. */
export function visibleNavItems(
  rights: ReadonlyArray<string> | undefined,
  isAdmin = false,
): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      !item.requiredRight || isAdmin || rights?.includes(item.requiredRight),
  );
}

/**
 * Which nav item is active for a pathname. "/" only matches exactly; every other
 * route also matches its sub-paths (`/projects/abc` highlights Projekty).
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

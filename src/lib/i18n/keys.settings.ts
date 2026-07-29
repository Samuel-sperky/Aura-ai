/**
 * Settings (`/settings`) — five sections (spec Q42): Vzhľad · Účet ·
 * Používatelia (admin) · Audit (admin) · Zálohy (admin).
 *
 * The appearance vocabulary (`appearance.*`), the role labels (`role.*`) and the
 * password/user/audit field labels (`auth.*`) already exist in `keys.common.ts`
 * and `keys.auth.ts` — this file only adds what those two do not cover.
 * A10 merges `settingsKeys` into `KEYS` in `src/lib/i18n/index.ts`.
 */
import type { TranslationEntry } from "./keys.common";

export const settingsKeys: Record<string, TranslationEntry> = {
  "settings.title": { sk: "Nastavenia", en: "Settings" },
  "settings.subtitle": {
    sk: "Vzhľad aplikácie, vlastný účet a správa inštalácie.",
    en: "Application appearance, your own account and installation management.",
  },
  "settings.section.appearance": { sk: "Vzhľad", en: "Appearance" },
  "settings.section.account": { sk: "Účet", en: "Account" },
  "settings.section.users": { sk: "Používatelia", en: "Users" },
  "settings.section.audit": { sk: "Audit", en: "Audit" },
  "settings.section.backups": { sk: "Zálohy", en: "Backups" },
  "settings.adminOnly": {
    sk: "Táto sekcia je len pre administrátora.",
    en: "This section is for administrators only.",
  },

  // ── Vzhľad ────────────────────────────────────────────────────────────────
  "settings.appearance.hint": {
    sk: "Nastavenie platí pre váš účet a pamätá sa v tomto prehliadači aj na serveri.",
    en: "The setting applies to your account and is remembered in this browser and on the server.",
  },
  "settings.appearance.langHint": {
    sk: "Jazyk sa uplatní po obnovení stránky.",
    en: "The language applies after a page reload.",
  },
  "settings.appearance.langSk": { sk: "Slovenčina", en: "Slovak" },
  "settings.appearance.langEn": { sk: "English", en: "English" },
  "settings.appearance.saved": { sk: "Vzhľad je uložený.", en: "Appearance saved." },

  // ── Účet ──────────────────────────────────────────────────────────────────
  "settings.account.hint": {
    sk: "Heslo musí mať aspoň 10 znakov. Po zmene zostanete prihlásený.",
    en: "The password must be at least 10 characters. You stay signed in after the change.",
  },
  "settings.account.repeat": { sk: "Nové heslo znova", en: "Repeat the new password" },
  "settings.account.mismatch": { sk: "Heslá sa nezhodujú.", en: "The passwords do not match." },
  "settings.account.role": { sk: "Rola", en: "Role" },
  "settings.account.email": { sk: "E-mail", en: "E-mail" },

  // ── Používatelia ──────────────────────────────────────────────────────────
  "settings.users.hint": {
    sk: "Roly určujú práva: Admin spravuje inštaláciu, Editor zapisuje, Prehliadač len číta.",
    en: "Roles define rights: Admin manages the installation, Editor writes, Viewer only reads.",
  },
  "settings.users.search": { sk: "Hľadať používateľa…", en: "Search users…" },
  "settings.users.allRoles": { sk: "Všetky roly", en: "All roles" },
  "settings.users.active": { sk: "Aktívny", en: "Active" },
  "settings.users.inactive": { sk: "Neaktívny", en: "Inactive" },
  "settings.users.newTitle": { sk: "Nový používateľ", en: "New user" },
  "settings.users.editTitle": { sk: "Upraviť používateľa", en: "Edit user" },
  "settings.users.password": { sk: "Heslo", en: "Password" },
  "settings.users.newPassword": {
    sk: "Nové heslo (nechajte prázdne bez zmeny)",
    en: "New password (leave blank to keep it)",
  },
  "settings.users.created": { sk: "Používateľ je vytvorený.", en: "User created." },
  "settings.users.updated": { sk: "Používateľ je upravený.", en: "User updated." },
  "settings.users.deleted": { sk: "Používateľ je zmazaný.", en: "User deleted." },
  "settings.users.deleteTitle": { sk: "Zmazať používateľa", en: "Delete user" },
  "settings.users.deleteWarning": {
    sk: "Účet sa zmaže natrvalo. Jeho záznamy v audite zostávajú.",
    en: "The account is deleted permanently. Its audit entries remain.",
  },
  "settings.users.empty": { sk: "Žiadni používatelia", en: "No users" },
  "settings.users.sessionsRevoked": {
    sk: "Aktívne prihlásenia používateľa boli zrušené.",
    en: "The user's active sessions were revoked.",
  },

  // ── Audit ─────────────────────────────────────────────────────────────────
  "settings.audit.hint": {
    sk: "Každý zápis vrátane prihlásení. IP a prehliadač zapisuje server.",
    en: "Every write, including sign-ins. IP and user agent are recorded server-side.",
  },
  "settings.audit.search": { sk: "Hľadať v audite…", en: "Search the audit…" },
  "settings.audit.filterAction": { sk: "Akcia", en: "Action" },
  "settings.audit.filterEntity": { sk: "Entita", en: "Entity" },
  "settings.audit.filterFrom": { sk: "Od", en: "From" },
  "settings.audit.filterTo": { sk: "Do", en: "To" },
  "settings.audit.allActions": { sk: "Všetky akcie", en: "All actions" },
  "settings.audit.allEntities": { sk: "Všetky entity", en: "All entities" },
  "settings.audit.col.detail": { sk: "Detail", en: "Detail" },
  "settings.audit.col.ip": { sk: "IP", en: "IP" },
  "settings.audit.severity": { sk: "Závažnosť", en: "Severity" },

  // ── Zálohy ────────────────────────────────────────────────────────────────
  "settings.backups.hint": {
    sk: "Dumpy vytvára skript scripts/backup/backup.ps1 do priečinka backups/ a drží posledné tri.",
    en: "Dumps are produced by scripts/backup/backup.ps1 into backups/ and the last three are kept.",
  },
  "settings.backups.last": { sk: "Posledný dump", en: "Last dump" },
  "settings.backups.size": { sk: "Veľkosť", en: "Size" },
  "settings.backups.count": { sk: "Počet dumpov", en: "Dump count" },
  "settings.backups.retained": { sk: "Držané dumpy", en: "Retained dumps" },
  "settings.backups.none": { sk: "Zatiaľ žiadna záloha", en: "No backup yet" },
  "settings.backups.noneDesc": {
    sk: "Spustite scripts/backup/backup.ps1 — prvý dump sa objaví tu.",
    en: "Run scripts/backup/backup.ps1 — the first dump shows up here.",
  },
  "settings.backups.stale": {
    sk: "Posledná záloha je starší než 7 dní.",
    en: "The latest backup is older than 7 days.",
  },
  "settings.backups.fresh": { sk: "Zálohy sú aktuálne.", en: "Backups are up to date." },
  "settings.backups.col.file": { sk: "Súbor", en: "File" },
  "settings.backups.col.created": { sk: "Vytvorené", en: "Created" },
};

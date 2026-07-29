// i18n keys owned by the auth module (login, session, password, roles).
// A10 merges every `keys.<module>.ts` into `src/lib/i18n/index.ts`.

export const authKeys = {
  // --- login screen ---------------------------------------------------------
  "auth.login.brand": { sk: "Aura Roadmap", en: "Aura Roadmap" },
  "auth.login.title": { sk: "Prihlásenie", en: "Sign in" },
  "auth.login.subtitle": {
    sk: "Plánovanie, evidencia a rozhodnutia na jednom mieste.",
    en: "Planning, records and decisions in one place.",
  },
  "auth.login.email": { sk: "E-mail", en: "E-mail" },
  "auth.login.emailPlaceholder": { sk: "meno@firma.sk", en: "name@company.com" },
  "auth.login.password": { sk: "Heslo", en: "Password" },
  "auth.login.submit": { sk: "Prihlásiť sa", en: "Sign in" },
  "auth.login.submitting": { sk: "Prihlasujem…", en: "Signing in…" },
  "auth.login.showPassword": { sk: "Zobraziť heslo", en: "Show password" },
  "auth.login.hidePassword": { sk: "Skryť heslo", en: "Hide password" },
  "auth.login.error.generic": {
    sk: "Prihlásenie zlyhalo.",
    en: "Sign-in failed.",
  },
  "auth.login.error.network": {
    sk: "Chyba pripojenia — beží server?",
    en: "Connection error — is the server running?",
  },

  // --- session -------------------------------------------------------------
  "auth.logout": { sk: "Odhlásiť sa", en: "Sign out" },
  "auth.session.expired": {
    sk: "Prihlásenie vypršalo. Prihláste sa znova.",
    en: "Your session expired. Please sign in again.",
  },
  "auth.forbidden": {
    sk: "Na túto akciu nemáte oprávnenie.",
    en: "You are not allowed to do this.",
  },

  // --- account: change password -------------------------------------------
  "auth.password.title": { sk: "Zmena hesla", en: "Change password" },
  "auth.password.current": { sk: "Súčasné heslo", en: "Current password" },
  "auth.password.new": { sk: "Nové heslo", en: "New password" },
  "auth.password.hint": {
    sk: "Aspoň 10 znakov.",
    en: "At least 10 characters.",
  },
  "auth.password.submit": { sk: "Zmeniť heslo", en: "Change password" },
  "auth.password.success": {
    sk: "Heslo bolo zmenené. Ostatné prihlásenia sme odhlásili.",
    en: "Password changed. Your other sessions were signed out.",
  },

  // --- roles (SK labels for the EN keys stored in the DB) -------------------
  "auth.role.admin": { sk: "Admin", en: "Admin" },
  "auth.role.editor": { sk: "Editor", en: "Editor" },
  "auth.role.viewer": { sk: "Prehliadač", en: "Viewer" },
  "auth.role.admin.hint": {
    sk: "Všetko vrátane mazania projektov, používateľov a nastavení.",
    en: "Everything, including deleting projects, users and settings.",
  },
  "auth.role.editor.hint": {
    sk: "Vytvára a upravuje projekty, úlohy, šprinty a checkpointy. Nemaže projekty.",
    en: "Creates and edits projects, work items, sprints and checkpoints. Cannot delete projects.",
  },
  "auth.role.viewer.hint": {
    sk: "Iba čítanie a vlastné filtre. Žiadny zápis.",
    en: "Read-only plus own filters. No writes.",
  },

  // --- user administration -------------------------------------------------
  "auth.users.title": { sk: "Používatelia", en: "Users" },
  "auth.users.email": { sk: "E-mail", en: "E-mail" },
  "auth.users.displayName": { sk: "Meno", en: "Name" },
  "auth.users.role": { sk: "Rola", en: "Role" },
  "auth.users.active": { sk: "Aktívny", en: "Active" },
  "auth.users.lastLogin": { sk: "Posledné prihlásenie", en: "Last sign-in" },
  "auth.users.create": { sk: "Nový používateľ", en: "New user" },
  "auth.users.delete": { sk: "Zmazať používateľa", en: "Delete user" },
  "auth.users.resetPassword": { sk: "Nastaviť nové heslo", en: "Set a new password" },
  "auth.users.neverLoggedIn": { sk: "Nikdy", en: "Never" },

  // --- audit ---------------------------------------------------------------
  "auth.audit.title": { sk: "Audit", en: "Audit" },
  "auth.audit.when": { sk: "Kedy", en: "When" },
  "auth.audit.who": { sk: "Kto", en: "Who" },
  "auth.audit.action": { sk: "Akcia", en: "Action" },
  "auth.audit.entity": { sk: "Objekt", en: "Object" },
  "auth.audit.empty": { sk: "Žiadne záznamy.", en: "No records." },
} as const;

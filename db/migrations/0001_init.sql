-- =============================================================================
-- 0001_init — Aura Roadmap: infrastructure, authentication, RBAC, audit.
-- =============================================================================
-- Forked from the aura-app family baseline (sperky-ai 0001_init.sql r. 348-434)
-- and adapted: login is by EMAIL (not username), because the first admin is
-- bootstrapped from ADMIN_EMAIL / ADMIN_PASSWORD.
--
-- Conventions enforced here (see docs/SCHEMA-NOTES.md):
--   * PK CHAR(36) everywhere, except append-only log tables (BIGINT AUTO_INCREMENT)
--   * ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 on every table
--   * created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL
--   * indexes ix_<table>_<col>, unique uq_<table>_<col>, FK fk_<table>_<ref>
--   * NO soft delete anywhere (no deleted_at) - hard delete + a row in audit_log
--
-- `_migrations` (the ledger) is created by scripts/migrate.ts, not here.
-- Reserved words (`key`) are backticked. Every statement is re-runnable.
-- Reference data (the 3 built-in roles + the first admin) is NOT inserted here -
-- the family seeds it from scripts/seed.ts, which upserts by natural key.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- app_roles - a named bundle of rights. `name` is the stable EN role key
-- (admin | editor | viewer). SK labels live in the i18n layer, not in the DB:
-- roles are a fixed set of keys, not a user-editable code list, so the family
-- name_sk / name_en columns do not apply. `builtin` roles cannot be deleted.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_roles` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `rights` JSON NOT NULL,
  `denied_pages` JSON NULL,
  `builtin` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_app_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- app_users - server-authoritative accounts. Login is by `email`.
-- `pin_hash` carries the argon2id-encoded PASSWORD hash (memoryCost 19456,
-- timeCost 2, parallelism 1). The column name is inherited from the family
-- baseline - it never stores a plaintext secret and never a numeric PIN.
-- `name` is the display name (AppUser.displayName), `initials` the avatar text.
-- Deactivate users with `active = 0`. A hard DELETE cascades their sessions,
-- comments, worklogs, notifications and preferences.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_users` (
  `id` CHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `initials` VARCHAR(8) NOT NULL DEFAULT '',
  `role_id` CHAR(36) NULL,
  `extra_rights` JSON NULL,
  `denied_pages` JSON NULL,
  `pin_hash` VARCHAR(255) NULL,
  `active` TINYINT NOT NULL DEFAULT 1,
  `color` VARCHAR(16) NULL,
  `last_login` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_app_users_email` (`email`),
  KEY `ix_app_users_role_id` (`role_id`),
  KEY `ix_app_users_active` (`active`),
  CONSTRAINT `fk_app_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `app_roles` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- app_sessions - server-side sessions, revalidated on EVERY request so that
-- logout / forced revoke / expiry are enforced server-side. The row id is also
-- embedded in the `aura_roadmap_session` JWT (jose, HS256).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `ip` VARCHAR(64) NULL,
  `user_agent` VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_app_sessions_user_id` (`user_id`),
  KEY `ix_app_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_app_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- auth_attempts - append-only login attempt log. Powers the per-username+ip
-- rate limit and the lockout (5 attempts / 15 min per ip, 15 per user -> 423).
-- `username` holds the email typed at the login form, so it is 255 wide.
-- No FK: failed attempts for non-existent accounts must still be recorded.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auth_attempts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `ip` VARCHAR(64) NOT NULL,
  `success` TINYINT NOT NULL DEFAULT 0,
  `ts` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_auth_attempts_user_ip_ts` (`username`, `ip`, `ts`),
  KEY `ix_auth_attempts_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- audit_log - append-only "who did what", with the user and IP derived on the
-- SERVER (never taken from the client). Since there is no soft delete, this is
-- the only trace a hard-deleted row leaves behind: every create / update /
-- delete on projects, work items, checkpoints, decisions, sprints and users -
-- plus login / logout and readiness overrides - lands here.
-- No FK on `user_id`: the log must outlive the account it refers to.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` CHAR(36) NULL,
  `username` VARCHAR(255) NULL,
  `action` VARCHAR(64) NOT NULL,
  `entity` VARCHAR(64) NULL,
  `entity_id` VARCHAR(64) NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `ip` VARCHAR(64) NULL,
  `ts` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_audit_log_user_id` (`user_id`),
  KEY `ix_audit_log_action` (`action`),
  KEY `ix_audit_log_entity` (`entity`, `entity_id`),
  KEY `ix_audit_log_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- app_config - misc non-relational app settings, one JSON value per key.
-- `key` is reserved in MariaDB and must stay backticked in every query.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_config` (
  `key` VARCHAR(128) NOT NULL,
  `value` JSON NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

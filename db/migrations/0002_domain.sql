-- =============================================================================
-- 0002_domain — Aura Roadmap: the 13 domain tables.
-- =============================================================================
-- Ported from the source planner's runtime DDL (`ensureWorkspaceSchema()`),
-- which is the real authority there - its dead ORM schema mirror is NOT.
-- See docs/SCHEMA-NOTES.md for the source-vs-source comparison and for every
-- column that was dropped on the way in.
--
-- SQLite -> MariaDB type conversion applied throughout:
--   text          -> VARCHAR(n) for bounded values, TEXT for prose
--   integer       -> INT, or TINYINT for booleans (0/1)
--   real          -> DECIMAL (not needed: the weighted score columns are gone)
--   ISO strings   -> DATE for calendar days, DATETIME for instants
--
-- Domain vocabularies. EN keys are stored in the DB, SK labels live in the i18n
-- layer (src/lib/i18n). Values are "ENUM-like VARCHARs" - the family validates
-- them with zod in src/lib/domain/contracts/*, never with a DB ENUM, so adding
-- a value never needs an ALTER TABLE:
--   projects.status         on_track | at_risk | blocked | planned
--   projects.health         green | amber | red | grey          (no blue)
--   priority                P1 | P2 | P3
--   work_items.status       backlog | in_progress | waiting | done
--   work_items.item_type    task | bug | idea
--   sprints.status          draft | planned | active | review | completed | cancelled
--   checkpoints.checkpoint_type   review | decision | delivery | gate
--   checkpoints.lifecycle         planned | ready | decided | blocked
--   checkpoint_decisions.outcome  go | conditional_go | no_go | deferred
--
-- Hard rules encoded below:
--   * NO soft delete (no deleted_at). Hard delete + ON DELETE CASCADE to the
--     children, and a row in audit_log.
--   * `version INT NOT NULL DEFAULT 1` on EXACTLY three tables - checkpoints,
--     sprints, work_items - the optimistic-concurrency set (409 VERSION_CONFLICT).
--   * `area` is a plain VARCHAR on the project. There is deliberately NO areas
--     table: the picker reads SELECT DISTINCT area FROM projects.
--   * work_items is at most TWO levels deep (parent_id). The third level is
--     rejected by the API, not by the schema.
--   * work_item_dependencies models only "blocks", so there is no
--     dependency_type and no lag_days column.
--
-- Table order below satisfies the FK dependency order (app_users comes from
-- 0001_init). Every statement is re-runnable.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- projects
-- `progress` is COMPUTED from the ratio of completed story points and rewritten
-- by the API - never edited by hand. `health` is MANUAL (the owner knows more
-- than the data) and only suggested from progress-vs-time.
-- `next_checkpoint` / `next_checkpoint_date` are a computed cache of the nearest
-- open checkpoint, refreshed on write - not user input.
-- Dropped vs the source: program, budget, spent, timeline_start, timeline_span,
-- task_count, completed_task_count, risks. `portfolio` became `area`.
-- Note: projects has NO `version` column - see docs/SCHEMA-NOTES.md.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `area` VARCHAR(80) NOT NULL DEFAULT '',
  `status` VARCHAR(16) NOT NULL DEFAULT 'planned',
  `health` VARCHAR(8) NOT NULL DEFAULT 'grey',
  `progress` INT NOT NULL DEFAULT 0,
  `owner` VARCHAR(128) NOT NULL DEFAULT '',
  `owner_initials` VARCHAR(8) NOT NULL DEFAULT '',
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `priority` VARCHAR(2) NOT NULL DEFAULT 'P2',
  `next_checkpoint` VARCHAR(160) NOT NULL DEFAULT '',
  `next_checkpoint_date` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_code` (`code`),
  KEY `ix_projects_area` (`area`),
  KEY `ix_projects_status` (`status`),
  KEY `ix_projects_health` (`health`),
  KEY `ix_projects_priority` (`priority`),
  KEY `ix_projects_end_date` (`end_date`),
  KEY `ix_projects_next_checkpoint_date` (`next_checkpoint_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- checkpoints - the decision queue.
-- The source carried BOTH `status` and `lifecycle`. They are merged into the one
-- `lifecycle` column (planned | ready | decided | blocked).
-- `readiness` is 0-100, COMPUTED from checkpoint_requirements (share of the
-- required ones that are complete). A decision is only allowed at 100, unless an
-- Admin overrides with a mandatory reason written to audit_log.
-- `owner_id` / `approver_id` are FKs to app_users, not free text: the rules
-- "only the approver may decide" and "for type `gate` the approver must differ
-- from the owner" need real identity to compare.
-- `due_date` is the single anchor date. `start_date` / `end_date` are optional
-- and only set when the checkpoint spans an interval rather than one day.
-- Dropped vs the source: date_label (derived for display), decision (the current
-- outcome is the checkpoint_decisions row with superseded_by IS NULL).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `checkpoints` (
  `id` CHAR(36) NOT NULL,
  `project_id` CHAR(36) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `impact` TEXT NULL,
  `checkpoint_type` VARCHAR(16) NOT NULL DEFAULT 'review',
  `lifecycle` VARCHAR(16) NOT NULL DEFAULT 'planned',
  `due_date` DATE NOT NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `owner_id` CHAR(36) NULL,
  `approver_id` CHAR(36) NULL,
  `readiness` INT NOT NULL DEFAULT 0,
  `decided_at` DATETIME NULL,
  `version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_checkpoints_project_id` (`project_id`),
  KEY `ix_checkpoints_due_date` (`due_date`),
  KEY `ix_checkpoints_lifecycle` (`lifecycle`),
  KEY `ix_checkpoints_checkpoint_type` (`checkpoint_type`),
  KEY `ix_checkpoints_owner_id` (`owner_id`),
  KEY `ix_checkpoints_approver_id` (`approver_id`),
  CONSTRAINT `fk_checkpoints_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_checkpoints_owner`
    FOREIGN KEY (`owner_id`) REFERENCES `app_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_checkpoints_approver`
    FOREIGN KEY (`approver_id`) REFERENCES `app_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- checkpoint_requirements - the checklist that drives readiness %.
-- Only rows with `required = 1` count towards readiness. `sort_order` is the
-- manual display order inside one checkpoint.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `checkpoint_requirements` (
  `id` CHAR(36) NOT NULL,
  `checkpoint_id` CHAR(36) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `required` TINYINT NOT NULL DEFAULT 1,
  `complete` TINYINT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_checkpoint_requirements_checkpoint_id` (`checkpoint_id`, `sort_order`),
  CONSTRAINT `fk_checkpoint_requirements_checkpoint`
    FOREIGN KEY (`checkpoint_id`) REFERENCES `checkpoints` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- checkpoint_decisions - IMMUTABLE decision records.
-- A decision is never rewritten. Formally reopening a checkpoint INSERTs a new
-- row and stamps the old one's `superseded_by` with the new id - that UPDATE is
-- the only mutation this table ever takes.
-- The current decision of a checkpoint: the row with superseded_by IS NULL.
-- `decided_by` deliberately has NO FK (same rule as created_by / audit_log):
-- the record must survive the deletion of the account that made it.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `checkpoint_decisions` (
  `id` CHAR(36) NOT NULL,
  `checkpoint_id` CHAR(36) NOT NULL,
  `outcome` VARCHAR(16) NOT NULL,
  `note` TEXT NULL,
  `decided_by` CHAR(36) NULL,
  `decided_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `superseded_by` CHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_checkpoint_decisions_checkpoint_id` (`checkpoint_id`),
  KEY `ix_checkpoint_decisions_outcome` (`outcome`),
  KEY `ix_checkpoint_decisions_decided_at` (`decided_at`),
  KEY `ix_checkpoint_decisions_superseded_by` (`superseded_by`),
  CONSTRAINT `fk_checkpoint_decisions_checkpoint`
    FOREIGN KEY (`checkpoint_id`) REFERENCES `checkpoints` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_checkpoint_decisions_superseded`
    FOREIGN KEY (`superseded_by`) REFERENCES `checkpoint_decisions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- sprints
-- `capacity_points` is the planned capacity, `committed_points` is frozen when
-- the sprint is committed, `completed_points` is recomputed on close.
-- Dropped vs the source: team_id (teams are out of scope), workstream, deleted_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sprints` (
  `id` CHAR(36) NOT NULL,
  `project_id` CHAR(36) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `goal` TEXT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft',
  `capacity_points` INT NOT NULL DEFAULT 0,
  `committed_points` INT NOT NULL DEFAULT 0,
  `completed_points` INT NOT NULL DEFAULT 0,
  `cadence_weeks` INT NOT NULL DEFAULT 2,
  `version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_sprints_project_id` (`project_id`),
  KEY `ix_sprints_status` (`status`),
  KEY `ix_sprints_start_date` (`start_date`),
  KEY `ix_sprints_end_date` (`end_date`),
  CONSTRAINT `fk_sprints_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- work_items - tasks, bugs and ideas. TWO levels only: a row with parent_id set
-- is a subtask, and the API rejects a parent that already has a parent.
-- `status_category` is the board grouping key and today mirrors `status` 1:1
-- (the per-project workflow engine of the source app is out of scope). The API
-- keeps the two in sync.
-- `rank_value` is the manual backlog order (ascending), the drag-and-drop key.
-- `story_points` of a parent is displayed as the sum of its subtasks when it has
-- any - the stored value is only used for leaf items.
-- `logged_minutes` is a cache of SUM(worklogs.minutes) for this item.
-- `assignee_id` / `reporter_id` are FKs to app_users (NULL = "Nepriradené"),
-- not free text - at this team size free text is a consistency leak.
-- Dropped vs the source: value_score, risk_score, urgency_score, effort_score,
-- priority_score, deleted_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_items` (
  `id` CHAR(36) NOT NULL,
  `project_id` CHAR(36) NOT NULL,
  `sprint_id` CHAR(36) NULL,
  `checkpoint_id` CHAR(36) NULL,
  `parent_id` CHAR(36) NULL,
  `item_type` VARCHAR(16) NOT NULL DEFAULT 'task',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'backlog',
  `status_category` VARCHAR(16) NOT NULL DEFAULT 'backlog',
  `priority` VARCHAR(2) NOT NULL DEFAULT 'P2',
  `story_points` INT NOT NULL DEFAULT 0,
  `rank_value` INT NOT NULL DEFAULT 0,
  `assignee_id` CHAR(36) NULL,
  `reporter_id` CHAR(36) NULL,
  `due_date` DATE NULL,
  `logged_minutes` INT NOT NULL DEFAULT 0,
  `version` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  KEY `ix_work_items_project_id` (`project_id`),
  KEY `ix_work_items_sprint_id` (`sprint_id`),
  KEY `ix_work_items_checkpoint_id` (`checkpoint_id`),
  KEY `ix_work_items_parent_id` (`parent_id`),
  KEY `ix_work_items_status` (`status`),
  KEY `ix_work_items_status_category` (`status_category`),
  KEY `ix_work_items_item_type` (`item_type`),
  KEY `ix_work_items_priority` (`priority`),
  KEY `ix_work_items_rank_value` (`rank_value`),
  KEY `ix_work_items_assignee_id` (`assignee_id`),
  KEY `ix_work_items_reporter_id` (`reporter_id`),
  KEY `ix_work_items_due_date` (`due_date`),
  KEY `ix_work_items_project_rank` (`project_id`, `rank_value`),
  CONSTRAINT `fk_work_items_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_work_items_sprint`
    FOREIGN KEY (`sprint_id`) REFERENCES `sprints` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_work_items_checkpoint`
    FOREIGN KEY (`checkpoint_id`) REFERENCES `checkpoints` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_work_items_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `work_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_work_items_assignee`
    FOREIGN KEY (`assignee_id`) REFERENCES `app_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_work_items_reporter`
    FOREIGN KEY (`reporter_id`) REFERENCES `app_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- work_item_comments - `edited_at` doubles as this table's updated_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_item_comments` (
  `id` CHAR(36) NOT NULL,
  `work_item_id` CHAR(36) NOT NULL,
  `author_id` CHAR(36) NOT NULL,
  `body` TEXT NOT NULL,
  `edited_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_work_item_comments_work_item_id` (`work_item_id`, `created_at`),
  KEY `ix_work_item_comments_author_id` (`author_id`),
  CONSTRAINT `fk_work_item_comments_work_item`
    FOREIGN KEY (`work_item_id`) REFERENCES `work_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_work_item_comments_author`
    FOREIGN KEY (`author_id`) REFERENCES `app_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- work_item_dependencies - "source BLOCKS target". Only one relation type
-- exists, so the composite PK is (source_id, target_id) and there is no
-- dependency_type and no lag_days column.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `work_item_dependencies` (
  `source_id` CHAR(36) NOT NULL,
  `target_id` CHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` CHAR(36) NULL,
  PRIMARY KEY (`source_id`, `target_id`),
  KEY `ix_work_item_dependencies_target_id` (`target_id`),
  CONSTRAINT `fk_work_item_dependencies_source`
    FOREIGN KEY (`source_id`) REFERENCES `work_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_work_item_dependencies_target`
    FOREIGN KEY (`target_id`) REFERENCES `work_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- worklogs - OPTIONAL time tracking, entered inline in the item detail.
-- `project_id` is denormalised from the work item so that per-project time
-- reports do not have to join through work_items.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `worklogs` (
  `id` CHAR(36) NOT NULL,
  `work_item_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `project_id` CHAR(36) NOT NULL,
  `work_date` DATE NOT NULL,
  `minutes` INT NOT NULL,
  `description` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `ix_worklogs_work_item_id` (`work_item_id`),
  KEY `ix_worklogs_user_id` (`user_id`),
  KEY `ix_worklogs_project_id` (`project_id`),
  KEY `ix_worklogs_work_date` (`work_date`),
  KEY `ix_worklogs_user_work_date` (`user_id`, `work_date`),
  CONSTRAINT `fk_worklogs_work_item`
    FOREIGN KEY (`work_item_id`) REFERENCES `work_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_worklogs_user`
    FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_worklogs_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- plan_versions - append-only baseline snapshots. One row is written whenever a
-- checkpoint is decided (and on demand). `snapshot_json` carries the frozen plan
-- plus the reference to whatever triggered it.
-- Dropped vs the source: status, published_at, published_by, version - there is
-- no draft/publish workflow, a snapshot is final the moment it is taken.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `plan_versions` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `baseline_date` DATE NOT NULL,
  `snapshot_json` JSON NOT NULL,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_plan_versions_baseline_date` (`baseline_date`),
  KEY `ix_plan_versions_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- notifications - in-app only (the bell with an unread count). There is no
-- e-mail channel and deliberately no `severity`: a notification is either
-- unread or read, nothing branches on importance.
-- `entity_type` / `entity_id` are a loose pointer used to build the deep link.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `body` VARCHAR(1000) NOT NULL DEFAULT '',
  `entity_type` VARCHAR(64) NULL,
  `entity_id` VARCHAR(64) NULL,
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_notifications_user_id` (`user_id`, `read_at`),
  KEY `ix_notifications_created_at` (`created_at`),
  KEY `ix_notifications_entity` (`entity_type`, `entity_id`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- user_preferences - one row per user: theme, density, language.
-- Mirrors the localStorage keys aura_roadmap_theme / aura_roadmap_density /
-- aura_roadmap_lang so the choice follows the account across devices.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `user_id` CHAR(36) NOT NULL,
  `preferences_json` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_preferences_user`
    FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- user_view_preferences - the last used filter set per page.
-- `page_key` is the route key: overview | timeline | projects | work-items |
-- decisions | settings.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_view_preferences` (
  `user_id` CHAR(36) NOT NULL,
  `page_key` VARCHAR(64) NOT NULL,
  `config_json` JSON NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `page_key`),
  CONSTRAINT `fk_user_view_preferences_user`
    FOREIGN KEY (`user_id`) REFERENCES `app_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

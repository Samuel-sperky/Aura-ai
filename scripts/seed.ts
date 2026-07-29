/**
 * Idempotent seed: demo accounts, projects, sprints, checkpoints, work items.
 *
 * Run after migration: `tsx scripts/seed.ts`
 * Safe to re-run; duplicates are prevented by natural keys.
 *
 * Generates two demo users with random passwords printed to stdout.
 * All data is fictitious.
 */

import "./_bootstrap";

import { randomUUID } from "node:crypto";
import { closePool, withTransaction } from "@/lib/db";
import { ensureBootstrapAdmin, roleIdByKey } from "@/lib/auth/bootstrap";
import { hashPassword } from "@/lib/auth/pin";
import { initialsOf } from "@/lib/auth/rbac";

// ────────────────────────────────────────────────────────────────────────────
// Demo data
// ────────────────────────────────────────────────────────────────────────────

interface DemoUser {
  email: string;
  name: string;
  role: "editor" | "viewer";
  password: string;
}

function randomPassword(length = 14): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * `YYYY-MM-DD HH:MM:SS` for a point N weeks in the past — a MariaDB DATETIME literal.
 *
 * Built from LOCAL calendar parts on purpose. `toISOString()` converts to UTC first,
 * which in a positive-offset zone (Europe/Bratislava is +1/+2) can shift the date one
 * day back and move a completed item into the previous chart bucket.
 */
function weeksAgo(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

const DEMO_USERS: DemoUser[] = [
  {
    email: "editor@aura-roadmap.local",
    name: "Jana Kováčová",
    role: "editor",
    password: randomPassword(),
  },
  {
    email: "viewer@aura-roadmap.local",
    name: "Marko Horváth",
    role: "viewer",
    password: randomPassword(),
  },
];

const DEMO_PROJECTS = [
  {
    code: "ES-100",
    name: "Redesign e-shopu",
    area: "E-shop",
    status: "on_track",
    health: "green",
    priority: "P1",
    owner: "Jana Kováčová",
    ownerInitials: "JK",
    startDate: "2026-08-01",
    endDate: "2027-02-28",
    description: "Komplexný redesign používateľského rozhrania e-shopu.",
  },
  {
    code: "TOOLS-50",
    name: "Interný CRM",
    area: "Interné nástroje",
    status: "at_risk",
    health: "amber",
    priority: "P2",
    owner: "Marko Horváth",
    ownerInitials: "MH",
    startDate: "2026-07-15",
    endDate: "2026-12-31",
    description: "Nový systém na správu vzťahov so zákazníkmi.",
  },
  {
    code: "MARK-30",
    name: "AI Chatbot",
    area: "Marketing automatizácia",
    status: "planned",
    health: "red",
    priority: "P3",
    owner: "Jana Kováčová",
    ownerInitials: "JK",
    startDate: "2026-10-01",
    endDate: "2027-03-31",
    description: "Chatbot pre 24/7 support zákazníkov.",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Seed function
// ────────────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log("[seed] Starting...\n");

  // Step 1: Bootstrap admin
  console.log("[seed] Ensuring bootstrap admin and roles...");
  const bootstrapResult = await ensureBootstrapAdmin();
  if (bootstrapResult.adminCreated) {
    console.log(`[seed] Admin created: ${bootstrapResult.adminEmail}`);
  } else if (bootstrapResult.skipped === "users-exist") {
    // Do NOT bail out here. Bootstrap runs outside the demo-data transaction, so
    // a run that fails midway still leaves the admin behind — returning early
    // would make every later run a silent no-op. Each demo insert below checks
    // for its own record, which is what actually makes the seed idempotent.
    console.log("[seed] Admin already exists — keeping it, continuing with demo data.\n");
  } else if (bootstrapResult.skipped === "missing-credentials") {
    console.log("[seed] ADMIN_EMAIL or ADMIN_PASSWORD not set in .env\n");
    throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD");
  }

  // Step 2: Insert demo users + projects + everything in a transaction
  await withTransaction(async (conn) => {
    console.log("[seed] Creating demo accounts...");

    // Create two demo users with random passwords
    const editorRoleId = await roleIdByKey("editor");
    const viewerRoleId = await roleIdByKey("viewer");

    if (!editorRoleId || !viewerRoleId) {
      throw new Error("Built-in roles not found");
    }

    const demoUserIds: Record<string, string> = {};

    for (const user of DEMO_USERS) {
      const existingRows = await conn.query("SELECT id FROM app_users WHERE email = ?", [
        user.email,
      ]);
      if (existingRows.length > 0) {
        console.log(`  [skip] ${user.email} already exists`);
        demoUserIds[user.email] = existingRows[0].id;
        continue;
      }

      const userId = randomUUID();
      const roleId = user.role === "editor" ? editorRoleId : viewerRoleId;
      const passwordHash = await hashPassword(user.password);

      await conn.execute(
        `INSERT INTO app_users (id, email, name, initials, role_id, pin_hash, active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [userId, user.email, user.name, initialsOf(user.name), roleId, passwordHash, userId],
      );

      demoUserIds[user.email] = userId;
      console.log(`  ${user.email} → password: ${user.password}`);
    }

    console.log("\n[seed] Creating projects...");
    const projectIds: Record<string, string> = {};

    for (const proj of DEMO_PROJECTS) {
      const existingRows = await conn.query("SELECT id FROM projects WHERE code = ?", [
        proj.code,
      ]);
      if (existingRows.length > 0) {
        console.log(`  [skip] ${proj.code} already exists`);
        projectIds[proj.code] = existingRows[0].id;
        continue;
      }

      const projectId = randomUUID();
      await conn.execute(
        `INSERT INTO projects
         (id, code, name, description, area, status, health, progress, owner, owner_initials,
          start_date, end_date, priority, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          proj.code,
          proj.name,
          proj.description,
          proj.area,
          proj.status,
          proj.health,
          proj.owner,
          proj.ownerInitials,
          proj.startDate,
          proj.endDate,
          proj.priority,
          demoUserIds[DEMO_USERS[0].email],
        ],
      );
      projectIds[proj.code] = projectId;
      console.log(`  ${proj.code}`);
    }

    console.log("\n[seed] Creating sprints...");
    const sprintIds: Record<string, string> = {};

    const sprints = [
      {
        key: "active",
        name: "Sprint 1.7 (Aug 2026)",
        projectId: projectIds["ES-100"],
        status: "active",
        goal: "Implementovať nový login flow",
        startDate: "2026-08-05",
        endDate: "2026-08-18",
      },
      {
        key: "draft",
        name: "Sprint 1.8 (Sep 2026)",
        projectId: projectIds["ES-100"],
        status: "draft",
        goal: "Payment integration",
        startDate: "2026-09-01",
        endDate: "2026-09-14",
      },
    ];

    for (const sprint of sprints) {
      const existingRows = await conn.query(
        "SELECT id FROM sprints WHERE project_id = ? AND name = ?",
        [sprint.projectId, sprint.name],
      );
      if (existingRows.length > 0) {
        sprintIds[sprint.key] = existingRows[0].id;
        console.log(`  [skip] ${sprint.name}`);
        continue;
      }

      const sprintId = randomUUID();
      await conn.execute(
        `INSERT INTO sprints
         (id, project_id, name, goal, status, start_date, end_date, cadence_weeks, capacity_points, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 2, 100, ?)`,
        [
          sprintId,
          sprint.projectId,
          sprint.name,
          sprint.goal,
          sprint.status,
          sprint.startDate,
          sprint.endDate,
          demoUserIds[DEMO_USERS[0].email],
        ],
      );
      sprintIds[sprint.key] = sprintId;
      console.log(`  ${sprint.name}`);
    }

    console.log("\n[seed] Creating checkpoints...");
    const checkpointIds: Record<string, string> = {};

    const checkpoints = [
      {
        key: "decided",
        name: "Schválenie dizajnu",
        projectId: projectIds["ES-100"],
        type: "review",
        lifecycle: "decided",
        dueDate: "2026-08-20",
        ownerId: demoUserIds[DEMO_USERS[0].email],
        approverId: demoUserIds[DEMO_USERS[0].email],
      },
      {
        key: "ready",
        name: "Príprava API",
        projectId: projectIds["TOOLS-50"],
        type: "decision",
        lifecycle: "ready",
        dueDate: "2026-09-15",
        ownerId: demoUserIds[DEMO_USERS[1].email],
        approverId: demoUserIds[DEMO_USERS[0].email],
      },
      {
        key: "planned",
        name: "Security audit",
        projectId: projectIds["ES-100"],
        type: "gate",
        lifecycle: "planned",
        dueDate: "2026-10-01",
        ownerId: demoUserIds[DEMO_USERS[0].email],
        approverId: demoUserIds[DEMO_USERS[1].email],
      },
      {
        key: "blocked",
        name: "Závislosť od treťej strany",
        projectId: projectIds["MARK-30"],
        type: "delivery",
        lifecycle: "blocked",
        dueDate: "2026-11-01",
        ownerId: demoUserIds[DEMO_USERS[1].email],
        approverId: null,
      },
    ];

    for (const cp of checkpoints) {
      const existingRows = await conn.query(
        "SELECT id FROM checkpoints WHERE project_id = ? AND name = ?",
        [cp.projectId, cp.name],
      );
      if (existingRows.length > 0) {
        checkpointIds[cp.key] = existingRows[0].id;
        console.log(`  [skip] ${cp.name}`);
        continue;
      }

      const cpId = randomUUID();
      await conn.execute(
        `INSERT INTO checkpoints
         (id, project_id, name, checkpoint_type, lifecycle, due_date, owner_id, approver_id, readiness, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cpId,
          cp.projectId,
          cp.name,
          cp.type,
          cp.lifecycle,
          cp.dueDate,
          cp.ownerId,
          cp.approverId,
          cp.lifecycle === "ready" ? 100 : cp.lifecycle === "planned" ? 40 : 0,
          demoUserIds[DEMO_USERS[0].email],
        ],
      );
      checkpointIds[cp.key] = cpId;
      console.log(`  ${cp.name}`);
    }

    // Requirements are what readiness % is actually computed from (share of the
    // REQUIRED ones that are complete), so the `complete` flags below must match
    // each checkpoint's readiness value or the UI contradicts itself.
    console.log("\n[seed] Adding checkpoint requirements...");
    const requirements: Record<string, { label: string; required?: boolean; complete: boolean }[]> = {
      decided: [
        { label: "Dizajn schválený vlastníkom", complete: true },
        { label: "Rozpočet potvrdený", complete: true },
        { label: "Termín odsúhlasený s tímom", complete: true },
        { label: "Poznámky z porady priložené", required: false, complete: true },
      ],
      ready: [
        { label: "API kontrakt zdokumentovaný", complete: true },
        { label: "Endpointy otestované", complete: true },
        { label: "Rate-limit nastavený", complete: true },
      ],
      planned: [
        { label: "Penetračný test naplánovaný", complete: true },
        { label: "Závislosti preverené", complete: true },
        { label: "Auth prehliadka dokončená", complete: false },
        { label: "Upload endpointy overené", complete: false },
        { label: "CSP skontrolované", complete: false },
      ],
      blocked: [
        { label: "Dodávateľ potvrdil termín", complete: false },
        { label: "Zmluva podpísaná", complete: false },
        { label: "Testovací prístup pridelený", complete: false },
      ],
    };

    let requirementCount = 0;
    for (const [key, reqs] of Object.entries(requirements)) {
      const checkpointId = checkpointIds[key];
      if (!checkpointId) continue;

      const existingRows = await conn.query(
        "SELECT COUNT(*) AS n FROM checkpoint_requirements WHERE checkpoint_id = ?",
        [checkpointId],
      );
      if (Number(existingRows[0].n) > 0) {
        console.log(`  [skip] ${key} already has requirements`);
        continue;
      }

      for (let i = 0; i < reqs.length; i++) {
        const req = reqs[i];
        await conn.execute(
          `INSERT INTO checkpoint_requirements
           (id, checkpoint_id, label, required, complete, sort_order, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            checkpointId,
            req.label,
            req.required === false ? 0 : 1,
            req.complete ? 1 : 0,
            i * 10,
            demoUserIds[DEMO_USERS[0].email],
          ],
        );
        requirementCount++;
      }
      console.log(`  ${key}: ${reqs.length} podmienok`);
    }
    console.log(`  Created ${requirementCount} requirements`);

    // The "decided" checkpoint needs its immutable decision record, otherwise the
    // decision queue has nothing to show as already resolved.
    console.log("\n[seed] Recording the decision on the decided checkpoint...");
    const decidedCheckpointId = checkpointIds["decided"];
    if (decidedCheckpointId) {
      const existingRows = await conn.query(
        "SELECT COUNT(*) AS n FROM checkpoint_decisions WHERE checkpoint_id = ?",
        [decidedCheckpointId],
      );
      if (Number(existingRows[0].n) > 0) {
        console.log("  [skip] decision already recorded");
      } else {
        await conn.execute(
          `INSERT INTO checkpoint_decisions (id, checkpoint_id, outcome, note, decided_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            decidedCheckpointId,
            "go",
            "Všetky povinné podmienky splnené, dizajn schválený bez pripomienok.",
            demoUserIds[DEMO_USERS[1].email],
          ],
        );
        await conn.execute("UPDATE checkpoints SET decided_at = NOW() WHERE id = ? AND decided_at IS NULL", [
          decidedCheckpointId,
        ]);
        console.log("  go — Schválenie dizajnu");
      }
    }

    console.log("\n[seed] Creating work items (~20 total)...");
    const workItemIds: string[] = [];

    const items = [
      // ES-100 items
      { projectId: "ES-100", sprintId: "active", type: "task", title: "Login screen redesign", status: "in_progress", priority: "P1", points: 5 },
      { projectId: "ES-100", sprintId: "active", type: "task", title: "Test login flow", status: "backlog", priority: "P1", points: 3, parentIndex: 0 },
      { projectId: "ES-100", sprintId: "active", type: "task", title: "Reset password flow", status: "waiting", priority: "P2", points: 3 },
      { projectId: "ES-100", sprintId: "active", type: "bug", title: "Mobile layout broken", status: "in_progress", priority: "P2", points: 2 },
      { projectId: "ES-100", sprintId: "draft", type: "task", title: "Payment gateway setup", status: "backlog", priority: "P1", points: 8 },
      { projectId: "ES-100", sprintId: "draft", type: "task", title: "Stripe integration", status: "backlog", priority: "P1", points: 5, parentIndex: 4 },
      { projectId: "ES-100", sprintId: "draft", type: "task", title: "PayPal integration", status: "backlog", priority: "P2", points: 3, parentIndex: 4 },
      { projectId: "ES-100", sprintId: null, type: "idea", title: "Support cryptocurrency", status: "backlog", priority: "P3", points: 13 },
      // Unassigned ES-100 work. Both sprints belong to ES-100, and the move API
      // rejects a cross-project target, so WITHOUT these the "move from backlog into
      // a sprint" path cannot be exercised at all — not by a test and not by hand.
      { projectId: "ES-100", sprintId: null, type: "task", title: "Refundácie a storná", status: "backlog", priority: "P2", points: 5 },
      { projectId: "ES-100", sprintId: null, type: "bug", title: "Chybný výpočet DPH v košíku", status: "backlog", priority: "P1", points: 2 },
      // Finished ES-100 work spread over recent weeks. `doneWeeksAgo` becomes
      // `updated_at`, which is what the 12-week completed-points chart buckets by —
      // a done item with updated_at NULL is skipped and the chart draws zeros.
      { projectId: "ES-100", sprintId: "active", type: "task", title: "Košík — prepočet cien", status: "done", priority: "P1", points: 5, doneWeeksAgo: 1 },
      { projectId: "ES-100", sprintId: "active", type: "task", title: "Nasadenie CI pipeline", status: "done", priority: "P2", points: 8, doneWeeksAgo: 2 },
      { projectId: "ES-100", sprintId: "draft", type: "bug", title: "Duplicitné e-maily po registrácii", status: "done", priority: "P1", points: 3, doneWeeksAgo: 4 },
      { projectId: "ES-100", sprintId: null, type: "task", title: "Migrácia obrázkov na CDN", status: "done", priority: "P2", points: 13, doneWeeksAgo: 6 },
      // TOOLS-50 items
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "Database schema design", status: "backlog", priority: "P1", points: 8 },
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "Create REST API", status: "backlog", priority: "P1", points: 13 },
      { projectId: "TOOLS-50", sprintId: null, type: "bug", title: "Pagination issues", status: "done", priority: "P2", points: 3, doneWeeksAgo: 3 },
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "User management", status: "backlog", priority: "P1", points: 5, parentIndex: 9 },
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "Role-based access", status: "backlog", priority: "P1", points: 3, parentIndex: 9 },
      // MARK-30 items
      { projectId: "MARK-30", sprintId: null, type: "task", title: "NLP model selection", status: "backlog", priority: "P1", points: 13 },
      { projectId: "MARK-30", sprintId: null, type: "task", title: "API wrapper", status: "waiting", priority: "P1", points: 5 },
      { projectId: "MARK-30", sprintId: null, type: "idea", title: "Support multiple languages", status: "backlog", priority: "P3", points: 21 },
    ];

    let itemsCreated = 0;
    let itemsSkipped = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const parentId = item.parentIndex !== undefined ? workItemIds[item.parentIndex] : null;

      const sprintId = item.sprintId ? sprintIds[item.sprintId] : null;
      const projectId = projectIds[item.projectId];

      // (project_id, title) is the natural key of the demo set. Without this check
      // every re-run duplicates the whole item tree — and because later comments and
      // worklogs address items by index, the duplicates silently pile up too.
      const existingItems = await conn.query(
        "SELECT id FROM work_items WHERE project_id = ? AND title = ? LIMIT 1",
        [projectId, item.title],
      );
      if (existingItems.length > 0) {
        workItemIds.push(existingItems[0].id);
        itemsSkipped++;
        continue;
      }

      const itemId = randomUUID();
      itemsCreated++;
      await conn.execute(
        `INSERT INTO work_items
         (id, project_id, sprint_id, parent_id, item_type, title, status, priority,
          story_points, rank_value, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          projectId,
          sprintId,
          parentId,
          item.type,
          item.title,
          item.status,
          item.priority,
          item.points,
          i * 100,
          demoUserIds[DEMO_USERS[0].email],
          // The 12-week chart buckets completed points by `updated_at`, so a done
          // item without one is invisible to it. Unfinished work keeps NULL, which
          // is what an untouched row looks like.
          item.doneWeeksAgo === undefined ? null : weeksAgo(item.doneWeeksAgo),
        ],
      );
      workItemIds.push(itemId);
    }
    console.log(`  Created ${itemsCreated} items, skipped ${itemsSkipped} existing`);

    console.log("\n[seed] Adding worklogs and comments...");

    // Items are addressed by their index in `items`, so that the project a
    // worklog belongs to can be resolved from the same source of truth.
    const projectIdOfItem = (index: number) => projectIds[items[index].projectId];

    // 3 comments
    const comments = [
      { itemIndex: 0, authorEmail: DEMO_USERS[0].email, body: "Už mám hotový draft prototypu." },
      { itemIndex: 1, authorEmail: DEMO_USERS[1].email, body: "Testoval som na iOS a Android — všetko OK." },
      { itemIndex: 4, authorEmail: DEMO_USERS[0].email, body: "Čakáme na schválenie od vedenia." },
    ];

    let commentsCreated = 0;
    for (const cmt of comments) {
      const existing = await conn.query(
        "SELECT id FROM work_item_comments WHERE work_item_id = ? AND body = ? LIMIT 1",
        [workItemIds[cmt.itemIndex], cmt.body],
      );
      if (existing.length > 0) continue;

      await conn.execute(
        `INSERT INTO work_item_comments (id, work_item_id, author_id, body)
         VALUES (?, ?, ?, ?)`,
        [randomUUID(), workItemIds[cmt.itemIndex], demoUserIds[cmt.authorEmail], cmt.body],
      );
      commentsCreated++;
    }

    // 5 worklogs
    const worklogs = [
      { itemIndex: 0, minutes: 120, note: "Dizajn komponentov" },
      { itemIndex: 1, minutes: 45, note: "Manuálne testovanie" },
      { itemIndex: 2, minutes: 90, note: "Implementácia" },
      { itemIndex: 3, minutes: 30, note: "Bug fix" },
      { itemIndex: 4, minutes: 60, note: "Dokumentácia API" },
    ];

    let worklogsCreated = 0;
    for (const log of worklogs) {
      const existing = await conn.query(
        "SELECT id FROM worklogs WHERE work_item_id = ? AND description = ? LIMIT 1",
        [workItemIds[log.itemIndex], log.note],
      );
      if (existing.length > 0) continue;

      await conn.execute(
        `INSERT INTO worklogs (id, work_item_id, user_id, project_id, work_date, minutes, description)
         VALUES (?, ?, ?, ?, CURDATE(), ?, ?)`,
        [
          randomUUID(),
          workItemIds[log.itemIndex],
          demoUserIds[DEMO_USERS[0].email],
          projectIdOfItem(log.itemIndex),
          log.minutes,
          log.note,
        ],
      );
      worklogsCreated++;
    }
    console.log(`  Created ${commentsCreated} comments and ${worklogsCreated} worklogs`);

    console.log("\n[seed] Creating baseline plan...");
    // 1 baseline after the "decided" checkpoint
    const planId = randomUUID();
    const planSnapshot = {
      total_work_items: items.length,
      total_story_points: items.reduce((s, i) => s + i.points, 0),
      items_by_status: { backlog: 12, in_progress: 2, done: 1, waiting: 2 },
    };

    const planName = "Baseline po rozhodnutí — Spustenie e-shopu";
    const existingPlans = await conn.query(
      "SELECT id FROM plan_versions WHERE name = ? LIMIT 1",
      [planName],
    );
    if (existingPlans.length > 0) {
      console.log("  [skip] baseline already exists");
    } else {
      await conn.execute(
        `INSERT INTO plan_versions (id, name, baseline_date, snapshot_json, created_by)
         VALUES (?, ?, CURDATE(), ?, ?)`,
        [planId, planName, JSON.stringify(planSnapshot), demoUserIds[DEMO_USERS[0].email]],
      );
      console.log(`  ${planName}`);
    }

    console.log("[seed] ✓ Seed complete!\n");
  });

  console.log("[seed] 🎉 All done. Demo accounts and data ready.\n");
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

// The pool must be closed explicitly: idle connections keep the event loop alive,
// so without this the script hangs forever after finishing its work.
seed()
  .then(() => closePool())
  .catch(async (err) => {
    console.error("[seed] Error:", err);
    await closePool().catch(() => {});
    process.exit(1);
  });

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
import { withTransaction } from "@/lib/db";
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
    console.log("[seed] Users already exist, skipping bootstrap.\n");
    return;
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
      // TOOLS-50 items
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "Database schema design", status: "backlog", priority: "P1", points: 8 },
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "Create REST API", status: "backlog", priority: "P1", points: 13 },
      { projectId: "TOOLS-50", sprintId: null, type: "bug", title: "Pagination issues", status: "done", priority: "P2", points: 3 },
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "User management", status: "backlog", priority: "P1", points: 5, parentIndex: 9 },
      { projectId: "TOOLS-50", sprintId: null, type: "task", title: "Role-based access", status: "backlog", priority: "P1", points: 3, parentIndex: 9 },
      // MARK-30 items
      { projectId: "MARK-30", sprintId: null, type: "task", title: "NLP model selection", status: "backlog", priority: "P1", points: 13 },
      { projectId: "MARK-30", sprintId: null, type: "task", title: "API wrapper", status: "waiting", priority: "P1", points: 5 },
      { projectId: "MARK-30", sprintId: null, type: "idea", title: "Support multiple languages", status: "backlog", priority: "P3", points: 21 },
    ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const parentId = item.parentIndex !== undefined ? workItemIds[item.parentIndex] : null;

      const itemId = randomUUID();
      const sprintId = item.sprintId ? sprintIds[item.sprintId] : null;
      const projectId = projectIds[item.projectId];

      await conn.execute(
        `INSERT INTO work_items
         (id, project_id, sprint_id, parent_id, item_type, title, status, priority, story_points, rank_value, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ],
      );
      workItemIds.push(itemId);
    }
    console.log(`  Created ${items.length} items`);

    console.log("\n[seed] Adding worklogs and comments...");

    // 3 comments
    const comments = [
      {
        itemId: workItemIds[0],
        author: DEMO_USERS[0].name,
        text: "Už mám hotový draft prototýpu.",
      },
      {
        itemId: workItemIds[1],
        author: DEMO_USERS[1].name,
        text: "Testoval som na iOS a Android — všetko OK.",
      },
      {
        itemId: workItemIds[4],
        author: DEMO_USERS[0].name,
        text: "Čakáme na schválenie od vedenia.",
      },
    ];

    for (const cmt of comments) {
      const commentId = randomUUID();
      await conn.execute(
        `INSERT INTO work_item_comments (id, work_item_id, text, created_by, author_name, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [commentId, cmt.itemId, cmt.text, demoUserIds[DEMO_USERS[0].email], cmt.author],
      );
    }

    // 5 worklogs
    const worklogs = [
      { itemId: workItemIds[0], minutes: 120, note: "Dizajn komponentov" },
      { itemId: workItemIds[1], minutes: 45, note: "Manuálne testovanie" },
      { itemId: workItemIds[2], minutes: 90, note: "Implementácia" },
      { itemId: workItemIds[3], minutes: 30, note: "Bug fix" },
      { itemId: workItemIds[4], minutes: 60, note: "Dokumentácia API" },
    ];

    for (const log of worklogs) {
      const logId = randomUUID();
      await conn.execute(
        `INSERT INTO worklogs (id, work_item_id, minutes, description, work_date, created_by)
         VALUES (?, ?, ?, ?, CURDATE(), ?)`,
        [logId, log.itemId, log.minutes, log.note, demoUserIds[DEMO_USERS[0].email]],
      );
    }
    console.log(`  Created ${comments.length} comments and ${worklogs.length} worklogs`);

    console.log("\n[seed] Creating baseline plan...");
    // 1 baseline after the "decided" checkpoint
    const planId = randomUUID();
    const planSnapshot = {
      total_work_items: items.length,
      total_story_points: items.reduce((s, i) => s + i.points, 0),
      items_by_status: { backlog: 12, in_progress: 2, done: 1, waiting: 2 },
    };

    await conn.execute(
      `INSERT INTO plan_versions (id, checkpoint_id, snapshot, created_by)
       VALUES (?, ?, ?, ?)`,
      [planId, checkpointIds["decided"], JSON.stringify(planSnapshot), demoUserIds[DEMO_USERS[0].email]],
    );

    console.log("[seed] ✓ Seed complete!\n");
  });

  console.log("[seed] 🎉 All done. Demo accounts and data ready.\n");
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

seed().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});

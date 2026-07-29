// GET  /api/admin/users — list users (right `users.manage`)
// POST /api/admin/users — create a user  (right `users.manage`)
//
// Gated on the granular right rather than on "is admin" so a future custom role
// could be granted user administration without the whole `admin` meta right.
// Editors and viewers never hold it (see lib/auth/rights.ts).

import { randomUUID } from "node:crypto";
import { defineRoute, badRequest } from "@/lib/api/defineRoute";
import { jsonList, jsonOk, jsonError } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import {
  USER_SELECT,
  initialsOf,
  mapUserRow,
  toPublicUser,
  type UserJoinRow,
} from "@/lib/auth/rbac";
import { hashPassword, PasswordPolicyError } from "@/lib/auth/pin";
import { roleIdByKey, ensureBuiltinRoles } from "@/lib/auth/bootstrap";
import { audit } from "@/lib/auth/audit";
import {
  userCreateSchema,
  userListQuerySchema,
} from "@/lib/domain/contracts/auth";
import {
  escapeLike,
  LIKE_ESCAPE_CLAUSE,
  pageMeta,
  toPagination,
} from "@/lib/domain/data";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

const USERS_RIGHT = { right: "users.manage" } as const;

export const GET = defineRoute(
  {
    auth: USERS_RIGHT,
    rateLimit: RATE_LIMITS.read,
    querySchema: userListQuerySchema,
  },
  async ({ query: q }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q.q) {
      conditions.push(
        `(u.email LIKE ? ${LIKE_ESCAPE_CLAUSE} OR u.name LIKE ? ${LIKE_ESCAPE_CLAUSE})`,
      );
      const like = `%${escapeLike(q.q)}%`;
      params.push(like, like);
    }
    if (q.role) {
      // `app_roles.name` holds the stable role key (admin | editor | viewer).
      conditions.push("r.name = ?");
      params.push(q.role);
    }
    if (q.active) {
      conditions.push("u.active = ?");
      params.push(q.active === "1" ? 1 : 0);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

    const totalRows = await query<{ n: number }>(
      `SELECT COUNT(*) AS n
         FROM app_users u
         LEFT JOIN app_roles r ON r.id = u.role_id${where}`,
      params,
    );
    const total = Number(totalRows[0]?.n ?? 0);

    const pg = toPagination(q.page, q.pageSize);
    const rows = await query<UserJoinRow>(
      `${USER_SELECT}${where}
        ORDER BY u.name ASC, u.email ASC
        LIMIT ? OFFSET ?`,
      [...params, pg.limit, pg.offset],
    );

    return jsonList(
      rows.map((row) => toPublicUser(mapUserRow(row))),
      pageMeta(pg, total),
    );
  },
);

export const POST = defineRoute(
  {
    auth: USERS_RIGHT,
    rateLimit: RATE_LIMITS.write,
    bodySchema: userCreateSchema,
  },
  async ({ user, body }) => {
    const email = body.email;

    const existing = await query<{ id: string }>(
      "SELECT id FROM app_users WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return jsonError("Používateľ s týmto e-mailom už existuje.", 409);
    }

    // Self-healing: a DB that predates a role row still gets a valid role_id.
    let roleId = await roleIdByKey(body.role);
    if (!roleId) {
      await ensureBuiltinRoles();
      roleId = await roleIdByKey(body.role);
    }
    if (!roleId) return badRequest("Rola nie je nastavená v databáze.");

    let passwordHash: string;
    try {
      passwordHash = await hashPassword(body.password);
    } catch (err) {
      if (err instanceof PasswordPolicyError) return badRequest(err.message);
      throw err;
    }

    const id = randomUUID();
    await execute(
      `INSERT INTO app_users
         (id, email, name, initials, role_id, pin_hash, extra_rights,
          denied_pages, active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        email,
        body.displayName,
        initialsOf(body.displayName),
        roleId,
        passwordHash,
        body.extraRights?.length ? JSON.stringify(body.extraRights) : null,
        body.deniedPages?.length ? JSON.stringify(body.deniedPages) : null,
        body.active ? 1 : 0,
        user.id,
      ],
    );

    const rows = await query<UserJoinRow>(`${USER_SELECT} WHERE u.id = ?`, [id]);
    const created = rows[0] ? toPublicUser(mapUserRow(rows[0])) : null;

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "user.create",
      entity: "app_users",
      entityId: id,
      severity: "success",
      // The password hash is never audited — only the account shape.
      newValues: {
        email,
        displayName: body.displayName,
        role: body.role,
        active: body.active,
        extraRights: body.extraRights ?? [],
        deniedPages: body.deniedPages ?? [],
      },
    });

    return jsonOk({ user: created }, { status: 201 });
  },
);

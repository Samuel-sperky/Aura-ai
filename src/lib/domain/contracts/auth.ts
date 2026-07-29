// Zod contracts for authentication, session and user administration.
//
// CLIENT-SAFE: only `zod` + the framework-free rights catalog. The login page,
// the settings screens and the route handlers all validate against these exact
// schemas, so the client can never send a shape the server rejects for a reason
// the client could have caught.
//
// Error messages are Slovak because `defineRoute` surfaces the FIRST zod issue
// straight to the user as `{ error: "<slovenská správa>" }`.

import { z } from "zod";
import { ROLE_KEYS, RIGHT_KEYS, PAGE_KEYS } from "@/lib/auth/rights";

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------

/**
 * Minimum password length (contract: at least 10 characters). Defined here — the
 * client-safe module — and re-exported from `@/lib/auth/pin` so the server has a
 * single source of truth without dragging argon2 into the browser bundle.
 */
export const MIN_PASSWORD_LENGTH = 10;

/** Maximum accepted password length (argon2 handles long inputs; bound the I/O). */
export const MAX_PASSWORD_LENGTH = 256;

/** A NEW password: policy-checked. Used on create + change, never on login. */
export const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `Heslo musí mať aspoň ${MIN_PASSWORD_LENGTH} znakov.`,
  )
  .max(MAX_PASSWORD_LENGTH, "Heslo je príliš dlhé.");

/**
 * A password being VERIFIED (login / current password). Deliberately NOT policy-
 * checked: telling an attacker "too short" before authentication leaks the policy
 * and distinguishes a wrong password from a malformed one.
 */
const secretSchema = z
  .string()
  .min(1, "Zadajte heslo.")
  .max(MAX_PASSWORD_LENGTH, "Heslo je príliš dlhé.");

/** Login identity: normalised to a trimmed, lower-cased e-mail. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Zadajte e-mail.")
  .max(190, "E-mail je príliš dlhý.")
  .email("Zadajte platný e-mail.");

// ---------------------------------------------------------------------------
// Session endpoints
// ---------------------------------------------------------------------------

/** POST /api/auth/login */
export const loginSchema = z.object({
  email: emailSchema,
  password: secretSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

/** POST /api/auth/change-password (self-service; requires the old password). */
export const changePasswordSchema = z
  .object({
    currentPassword: secretSchema,
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "Nové heslo musí byť iné než súčasné.",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------
// User administration (right `users.manage`)
// ---------------------------------------------------------------------------

export const roleKeySchema = z.enum(ROLE_KEYS, {
  message: "Neplatná rola.",
});

/** Per-user extra grants — must come from the catalog, never free text. */
const rightsListSchema = z
  .array(z.enum(RIGHT_KEYS as [string, ...string[]], { message: "Neznáme právo." }))
  .max(RIGHT_KEYS.length)
  .default([]);

/** Per-user page blacklist — must be one of the six navigation pages. */
const deniedPagesSchema = z
  .array(z.enum(PAGE_KEYS, { message: "Neznáma stránka." }))
  .max(PAGE_KEYS.length)
  .default([]);

const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Zadajte meno (aspoň 2 znaky).")
  .max(128, "Meno je príliš dlhé.");

/** POST /api/admin/users */
export const userCreateSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
  role: roleKeySchema,
  password: passwordSchema,
  active: z.boolean().default(true),
  extraRights: rightsListSchema.optional(),
  deniedPages: deniedPagesSchema.optional(),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

/** PATCH /api/admin/users/[id] — every field optional, at least one required. */
export const userUpdateSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    role: roleKeySchema.optional(),
    active: z.boolean().optional(),
    /** Admin-set password reset. Revokes every session of the target user. */
    password: passwordSchema.optional(),
    extraRights: rightsListSchema.optional(),
    deniedPages: deniedPagesSchema.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Nie je čo zmeniť.",
  });
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

/** GET /api/admin/users */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  /** Free-text search over e-mail + display name. */
  q: z.string().trim().max(128).optional(),
  role: roleKeySchema.optional(),
  active: z.enum(["1", "0"]).optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

// ---------------------------------------------------------------------------
// Audit log (right `audit.read`)
// ---------------------------------------------------------------------------

/** GET /api/audit */
export const auditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  action: z.string().trim().max(64).optional(),
  entity: z.string().trim().max(64).optional(),
  userId: z.string().trim().max(36).optional(),
  /** Inclusive lower bound, `YYYY-MM-DD` or full ISO. */
  from: z.string().trim().max(32).optional(),
  /** Inclusive upper bound (whole day when date-only). */
  to: z.string().trim().max(32).optional(),
  /** Free text across e-mail / action / entity / entity id. */
  q: z.string().trim().max(128).optional(),
});
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

// ---------------------------------------------------------------------------
// Wire shapes returned by the auth endpoints (shared with the client)
// ---------------------------------------------------------------------------

/** The safe user projection returned by /api/auth/me and the admin endpoints. */
export interface PublicUserDto {
  id: string;
  email: string;
  displayName: string;
  role: (typeof ROLE_KEYS)[number];
  rights: string[];
  deniedPages: string[];
  active: boolean;
  lastLogin: string | null;
  createdAt: string | null;
}

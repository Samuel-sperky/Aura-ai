// Emergency password reset / account unlock — the ONLY back door, and it requires
// shell access to the host plus the DB credentials.
//
// This exists because the app deliberately has no in-app escape hatch: no
// dev-fallback session secret, no localhost lockout exemption, and the last active
// administrator cannot be demoted or deleted through the API. If an admin forgets
// their password or locks themselves out, this is the recovery path.
//
// Usage (from the project root):
//   npx tsx scripts/reset-pin.ts <email>                 # generate a strong password
//   npx tsx scripts/reset-pin.ts <email> <new-password>  # set a known one
//   npx tsx scripts/reset-pin.ts <email> --unlock-only   # only clear the lockout
//
// It always: clears the failed-attempt lockout, revokes every session of that user
// (a reset must invalidate anything opened with the old secret) and writes an
// `audit_log` row with ip='cli'.
//
// The generated password is printed ONCE to this terminal and never stored in
// plaintext. Hand it over out-of-band and change it after first sign-in.

import "./_bootstrap";
import { randomBytes } from "node:crypto";
import { getPool, query, execute } from "../src/lib/db";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/auth/pin";

interface UserRow {
  id: string;
  email: string;
  name: string;
  active: number;
}

/** 24 url-safe characters ≈ 128 bits of entropy. */
function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/reset-pin.ts <email> [new-password | --unlock-only]",
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const rawEmail = process.argv[2];
  const secondArg = process.argv[3];
  if (!rawEmail) usage();

  const email = rawEmail.trim().toLowerCase();
  const unlockOnly = secondArg === "--unlock-only";

  const rows = await query<UserRow>(
    "SELECT id, email, name, active FROM app_users WHERE email = ?",
    [email],
  );
  const user = rows[0];
  if (!user) {
    console.error(`No user with e-mail ${email}.`);
    process.exit(1);
  }

  // Always clear the lockout — it is the other half of "I cannot get in".
  // `auth_attempts.username` stores the e-mail (family column name).
  const cleared = await execute(
    "DELETE FROM auth_attempts WHERE username = ? AND success = 0",
    [email],
  );
  console.log(
    `Cleared ${cleared.affectedRows} failed login attempt(s) for ${email}.`,
  );

  if (unlockOnly) {
    await execute(
      `INSERT INTO audit_log (user_id, username, action, entity, entity_id, ip)
       VALUES (?, ?, 'account.unlock', 'app_users', ?, 'cli')`,
      [user.id, email, user.id],
    );
    console.log("Lockout cleared. Password left unchanged.");
    return;
  }

  const provided = secondArg;
  const password = provided ?? generatePassword();
  if (provided && provided.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  // hashPassword re-checks the policy — one choke point for every reset path.
  const passwordHash = await hashPassword(password);

  // `pin_hash` is the family column name for the argon2id password hash.
  await execute(
    `UPDATE app_users
        SET pin_hash = ?, updated_at = NOW(), updated_by = NULL
      WHERE id = ?`,
    [passwordHash, user.id],
  );

  const revoked = await execute(
    "UPDATE app_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL",
    [user.id],
  );

  await execute(
    `INSERT INTO audit_log (user_id, username, action, entity, entity_id, new_values, ip)
     VALUES (?, ?, 'password.reset.cli', 'app_users', ?, ?, 'cli')`,
    [
      user.id,
      email,
      user.id,
      JSON.stringify({
        __audit: {
          severity: "critical",
          detail: "Heslo bolo resetované z príkazovej riadky.",
          meta: { revokedSessions: Number(revoked.affectedRows ?? 0) },
        },
      }),
    ],
  );

  console.log(
    `Password reset for ${user.name} <${email}>` +
      (user.active ? "" : " (account is INACTIVE — activate it in Settings)"),
  );
  console.log(`Revoked ${revoked.affectedRows} active session(s).`);
  if (!provided) {
    console.log("");
    console.log(`  New password: ${password}`);
    console.log("");
    console.log("Shown once. Hand it over securely and change it after sign-in.");
  }
}

main()
  .then(() => getPool().end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Password reset failed:", err);
    try {
      await getPool().end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });

// Generate the secrets required by src/lib/env.ts.
// Usage: npm run keys:gen
// Copy the printed values into .env.local (or the production secret store).
//
// There are NO dev fallbacks for these — the app refuses to boot without them
// (see the fail-closed note in src/lib/env.ts), so this script is the intended
// way to get a working local environment.
import { randomBytes } from "node:crypto";

const sessionSecret = randomBytes(48).toString("base64");
const encKey = randomBytes(32).toString("base64");

console.log("SESSION_SECRET=" + sessionSecret);
console.log("SECRETS_ENC_KEY=" + encKey);
console.log(
  "\n# SESSION_SECRET length:",
  sessionSecret.length,
  "chars (must be >= 32).",
);
console.log(
  "# SECRETS_ENC_KEY decodes to",
  Buffer.from(encKey, "base64").length,
  "bytes (must be 32).",
);

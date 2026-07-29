// AES-256-GCM authenticated encryption for values stored at rest.
//
// Blob format (all base64, dot-separated):
//   v1.<iv>.<ciphertext>.<authTag>
// - iv:         12 random bytes (GCM standard nonce size)
// - ciphertext: AES-256-GCM output
// - authTag:    16-byte GCM authentication tag (integrity + authenticity)
//
// The key is SECRETS_ENC_KEY (32 raw bytes, supplied base64 via env).
// GCM detects any tampering: decryptSecret throws if the blob was modified.
//
// Server-only by nature (node:crypto + the secret key). Also reachable from node
// scripts, so it must NOT import the `server-only` package.
//
// NOTE: this is NOT for passwords. User passwords use argon2id
// (@node-rs/argon2, memoryCost 19456, timeCost 2, parallelism 1) — see the auth
// module. Hashing is one-way; encryption is not a substitute.

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96-bit nonce, recommended for GCM
const TAG_LEN = 16; // 128-bit auth tag
const VERSION = "v1";

function getKey(): Buffer {
  const key = Buffer.from(env.SECRETS_ENC_KEY, "base64");
  if (key.length !== 32) {
    // env.ts already validates this, but guard again at use-site.
    throw new Error("SECRETS_ENC_KEY must decode to exactly 32 bytes");
  }
  return key;
}

/** Encrypt a UTF-8 plaintext. Returns an opaque, storable string blob. */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(".");
}

/** Decrypt a blob produced by encryptSecret. Throws on tampering / bad key. */
export function decryptSecret(blob: string): string {
  const parts = blob.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Invalid encrypted secret format");
  }
  const [, ivB64, ctB64, tagB64] = parts as [string, string, string, string];
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  if (iv.length !== IV_LEN) throw new Error("Invalid IV length");
  if (tag.length !== TAG_LEN) throw new Error("Invalid auth tag length");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(), // throws on auth tag mismatch (tampering)
  ]);
  return plain.toString("utf8");
}

/**
 * Constant-time string comparison for opaque tokens (session ids, nonces).
 * NOT for password verification — use argon2 verify for that.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Generate a random, URL-safe opaque token (default 32 bytes of entropy). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

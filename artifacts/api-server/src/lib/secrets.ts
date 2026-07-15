import { logger } from "./logger";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

// ---------------------------------------------------------------------------
// Persistent key store
// If environment variables are not set, we generate a random key ONCE and
// persist it to a local file so it survives server restarts.  This means
// JWT tokens remain valid across restarts even without env vars configured.
// ---------------------------------------------------------------------------

const KEYS_FILE = path.resolve(
  process.env.KEYS_FILE_PATH ||
  path.join(os.homedir(), ".runtime-keys.json")
);

function loadOrGenerateKey(keyName: string, envValue: string | undefined): string {
  // 1. Prefer the explicit environment variable
  if (envValue && envValue.trim().length >= 16) {
    return envValue.trim();
  }

  // 2. Try loading a previously-generated key from the persistent file
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const stored = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
      if (stored[keyName] && typeof stored[keyName] === "string") {
        return stored[keyName];
      }
    }
  } catch {
    // ignore read/parse errors – we'll generate a new key below
  }

  // 3. Generate a new key and persist it
  const newKey = crypto.randomBytes(32).toString("hex");
  try {
    let existing: Record<string, string> = {};
    if (fs.existsSync(KEYS_FILE)) {
      try { existing = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8")); } catch { /* ignore */ }
    }
    existing[keyName] = newKey;
    fs.writeFileSync(KEYS_FILE, JSON.stringify(existing, null, 2), "utf8");
  } catch {
    // If we cannot write, still return the generated key for this session
    // (tokens will become invalid after restart in this edge case)
    logger.warn(`Could not persist ${keyName} to ${KEYS_FILE}. Sessions will reset on restart.`);
  }

  logger.info(
    `Generated new ${keyName}. ` +
    `Set the ${keyName.replace(/-/g, "_").toUpperCase()} environment variable to make sessions permanent.`
  );

  return newKey;
}

export const JWT_SECRET = loadOrGenerateKey("jwt_secret", process.env.JWT_SECRET);
export const CERT_SIGN_SECRET = loadOrGenerateKey("cert_sign_secret", process.env.CERT_SIGN_SECRET);
export const WALLET_SECRET = loadOrGenerateKey("wallet_secret", process.env.WALLET_SECRET);

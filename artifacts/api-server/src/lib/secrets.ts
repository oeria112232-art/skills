import { logger } from "./logger";
import crypto from "crypto";

const JWT_SECRET_ENV = process.env.JWT_SECRET;
const CERT_SIGN_SECRET_ENV = process.env.CERT_SIGN_SECRET;
const WALLET_SECRET_ENV = process.env.WALLET_SECRET;

const isProd = process.env.NODE_ENV === "production" || process.env.CI === "true";

if (isProd) {
  if (!JWT_SECRET_ENV) {
    logger.warn("WARNING: JWT_SECRET is not set in environment variables. Generating a random key for session security.");
  }
  if (!CERT_SIGN_SECRET_ENV) {
    logger.warn("WARNING: CERT_SIGN_SECRET is not set in environment variables. Generating a random key for certificates.");
  }
}

// Fallback to random secure keys rather than hardcoded static defaults
export const JWT_SECRET = JWT_SECRET_ENV || crypto.randomBytes(32).toString("hex");
export const CERT_SIGN_SECRET = CERT_SIGN_SECRET_ENV || crypto.randomBytes(32).toString("hex");
export const WALLET_SECRET = WALLET_SECRET_ENV || crypto.randomBytes(32).toString("hex");

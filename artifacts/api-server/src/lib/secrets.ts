import { logger } from "./logger";

const JWT_SECRET_ENV = process.env.JWT_SECRET;
const CERT_SIGN_SECRET_ENV = process.env.CERT_SIGN_SECRET;
const WALLET_SECRET_ENV = process.env.WALLET_SECRET;

const isProd = process.env.NODE_ENV === "production" || process.env.CI === "true";

if (isProd) {
  if (!JWT_SECRET_ENV) {
    logger.error("FATAL: JWT_SECRET must be set in environment variables in production.");
    process.exit(1);
  }
  if (!CERT_SIGN_SECRET_ENV) {
    logger.error("FATAL: CERT_SIGN_SECRET must be set in environment variables in production.");
    process.exit(1);
  }
}

export const JWT_SECRET = JWT_SECRET_ENV || "mharat_secure_default_jwt_secret_key_8829";
export const CERT_SIGN_SECRET = CERT_SIGN_SECRET_ENV || "mharat_secure_session_secret_key_8829";
export const WALLET_SECRET = WALLET_SECRET_ENV || "mharat_secure_wallet_fallback_secret_key_8829";

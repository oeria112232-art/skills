import app from "./app";
import { logger } from "./lib/logger";

// Validate required environment variables at startup
const REQUIRED_ENV_VARS = ["PORT", "JWT_SECRET", "FIREBASE_API_KEY", "FIREBASE_DATABASE_URL"];
const missingVars: string[] = [];
for (const varName of REQUIRED_ENV_VARS) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}
if (missingVars.length > 0) {
  logger.fatal({ missing: missingVars }, "Missing required environment variables");
  process.exit(1);
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, closing server...");

  server.close(() => {
    logger.info("HTTP server closed.");
    // Close DB connection if needed (e.g., dbPool.end())
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled rejections
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

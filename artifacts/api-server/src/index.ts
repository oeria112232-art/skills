import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env.PORT || "8080";
const port = /^\d+$/.test(rawPort) ? Number(rawPort) : rawPort;

if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
  console.warn("WARNING: JWT_SECRET (or SESSION_SECRET) is not set in environment variables. Using a fallback secret key. This is insecure for production.");
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

// Handle uncaught exceptions - log them and keep the server running
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception - Server kept alive");
});

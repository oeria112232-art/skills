// This file serves as the main entry point for Hostinger's Node.js environment.
// It imports and runs the compiled backend application.
import('./artifacts/api-server/dist/index.mjs').catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

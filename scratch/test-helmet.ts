import express from "express";
import helmet from "helmet";

const app = express();

app.use((req, res, next) => {
  res.locals.cspNonce = "test-nonce";
  next();
});

try {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (req: any, res: any) => `'nonce-${res.locals.cspNonce}'`],
      }
    }
  }));
  console.log("Helmet middleware initialized successfully");
} catch (err) {
  console.error("Failed to initialize Helmet:", err);
}

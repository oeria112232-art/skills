const express = require("express");
const helmet = require("helmet");

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
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      }
    }
  }));
  console.log("Helmet middleware initialized successfully");
} catch (err) {
  console.error("Failed to initialize Helmet:", err);
}

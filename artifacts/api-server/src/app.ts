import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import crypto from "crypto";
import router from "./routes";
import { logger } from "./lib/logger";
import { sanitizeInput, validateBase64Payload, validateInputLimits } from "./middlewares/sanitization";
import { generalRateLimit, authRateLimit } from "./middlewares/rateLimit";

import path from "path";

const app: Express = express();

// Security headers middleware (helmet-like)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.daily.co; frame-src https://daily.co;");
  res.removeHeader("X-Powered-By");
  next();
});

// CORS configuration — restrict to allowed origins in production
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    }
    if (process.env.NODE_ENV === "production") {
      logger.warn(`CORS_ORIGINS is empty in production. Allowing request from origin: ${origin}`);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
  maxAge: 86400,
}));

app.use(
  pinoHttp({
    logger,
    genReqId: () => crypto.randomUUID(),
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Body parsing with size limits
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Input sanitization
app.use(sanitizeInput);
app.use(validateInputLimits);
app.use(validateBase64Payload(5));

// General rate limiting
app.use("/api", generalRateLimit);

// Auth-specific rate limiting
app.use("/api/auth", authRateLimit);

app.use("/api/uploads", express.static(path.resolve(import.meta.dirname, "../../../uploads")));
app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const publicPath = path.resolve(import.meta.dirname, "../../eduplat/dist/public");
  app.use(express.static(publicPath));
  
  // SPA routing fallback
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}

// Global error handler — must be AFTER all routes
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;

  if (statusCode === 500) {
    logger.error({ err, url: _req.url, method: _req.method }, "Unhandled server error");
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && statusCode === 500 && { stack: err.stack }),
  });
});

export default app;

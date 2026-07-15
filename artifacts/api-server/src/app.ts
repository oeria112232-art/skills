import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import crypto from "crypto";
import router from "./routes";
import { logger } from "./lib/logger";
import { sanitizeInput, validateBase64Payload, validateInputLimits } from "./middlewares/sanitization";
import { generalRateLimit, authRateLimit } from "./middlewares/rateLimit";
import { requireAuth } from "./middlewares/auth";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Generate CSP nonce for every request
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
  next();
});

// Configure Helmet with strict security policies
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (_req: Request, res: Response) => `'nonce-${(res as any).locals.cspNonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.daily.co"],
      frameSrc: ["https://daily.co", "https://*.daily.co"],
    }
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: "deny" }
}));

// CORS configuration — restrict to allowed origins in production
const isProduction = process.env.NODE_ENV === "production" || process.env.CI === "true";
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  logger.warn("WARNING: CORS_ORIGINS is not set in environment variables. Allowing all origins for compatibility.");
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
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

// Static uploads serving - allow public covers, authenticate other folders
app.use("/api/uploads/covers", express.static(path.resolve(__dirname, "../../../uploads/covers")));
app.use("/api/uploads", requireAuth, express.static(path.resolve(__dirname, "../../../uploads")));

app.use("/api", router);

if (isProduction) {
  const publicPath = path.resolve(__dirname, "../../eduplat/dist/public");
  app.use(express.static(publicPath));
  
  // SPA routing fallback
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (req.path.includes(".")) {
      return next();
    }
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

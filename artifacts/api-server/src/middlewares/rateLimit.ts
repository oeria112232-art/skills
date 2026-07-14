import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
}) {
  const { windowMs, max, keyPrefix = "rl", message } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      store.set(key, entry);
      next();
      return;
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: message || "Too many requests. Please try again later.",
        retryAfter,
      });
      return;
    }

    next();
  };
}

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Pre-configured rate limiters for common endpoints
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: "rl:auth",
  message: "تم تجاوز حد محاولات تسجيل الدخول. يرجى المحاولة بعد دقيقة.",
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "rl:payment",
  message: "تم تجاوز حد طلبات الدفع. يرجى المحاولة بعد دقيقة.",
});

export const transferRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyPrefix: "rl:transfer",
  message: "تم تجاوز حد طلبات التحويل. يرجى المحاولة بعد دقيقة.",
});

export const consultationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "rl:consult",
  message: "تم تجاوز حد طلبات الاستشارات. يرجى المحاولة بعد دقيقة.",
});

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: "rl:general",
  message: "تم تجاوز حد الطلبات. يرجى المحاولة بعد دقيقة.",
});

export const certVerifyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: "rl:cert-verify",
  message: "تم تجاوز حد طلبات التحقق. يرجى المحاولة بعد دقيقة.",
});

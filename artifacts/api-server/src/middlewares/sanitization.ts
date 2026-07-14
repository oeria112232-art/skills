import type { Request, Response, NextFunction } from "express";

// Basic HTML entity encoding to prevent XSS
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Recursively sanitize all string values in an object
function sanitizeValue(value: any): any {
  if (typeof value === "string") {
    return escapeHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

// Middleware to sanitize request body inputs
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  // Also sanitize query parameters to prevent reflected XSS
  if (req.query && typeof req.query === "object") {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        (req.query as any)[key] = escapeHtml(value);
      }
    }
  }
  next();
}

// Validate that file uploads don't exceed size limits (already handled by express.json limit)
// This middleware adds additional validation for base64 data URLs
export function validateBase64Payload(maxSizeMb: number = 5) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === "object") {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === "string" && value.startsWith("data:") && value.length > maxSizeMb * 1024 * 1024 * 1.37) {
          res.status(413).json({ error: `Payload too large: ${key} exceeds ${maxSizeMb}MB limit` });
          return;
        }
      }
    }
    next();
  };
}

// Input length limits for common fields
const FIELD_LENGTH_LIMITS: Record<string, number> = {
  name: 100,
  email: 254,
  password: 128,
  title: 200,
  description: 5000,
  question: 2000,
  message: 5000,
  company: 200,
  location: 200,
  type: 50,
  level: 50,
  category: 100,
  answer: 5000,
  response: 5000,
  notes: 2000,
  url: 2048,
  fileName: 255,
  fileType: 100,
  code: 50,
  status: 50,
  coverLetter: 5000,
  applicantName: 100,
  applicantEmail: 254,
  cashAmount: 50,
  transferScreenshot: 50000,
  userName: 100,
  userEmail: 254,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware to validate input field lengths and email format
export function validateInputLimits(req: Request, res: Response, next: NextFunction): void {
  if (!req.body || typeof req.body !== "object") {
    next();
    return;
  }

  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value !== "string") continue;

    // Check field length
    const limit = FIELD_LENGTH_LIMITS[key];
    if (limit && value.length > limit) {
      res.status(400).json({ error: `Field '${key}' exceeds maximum length of ${limit} characters` });
      return;
    }

    // Validate email format for email-like fields
    if ((key === "email" || key === "applicantEmail" || key === "userEmail") && value.length > 0) {
      if (!EMAIL_REGEX.test(value)) {
        res.status(400).json({ error: `Field '${key}' must be a valid email address` });
        return;
      }
    }
  }

  next();
}

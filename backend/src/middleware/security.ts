import type { Request, Response, NextFunction } from "express";

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipInTests?: boolean;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const records = new Map<string, ClientRecord>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.skipInTests && (process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT === "true")) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const key = `${ip}`;
    const now = Date.now();
    let record = records.get(key);

    if (!record || now >= record.resetTime) {
      record = { count: 1, resetTime: now + options.windowMs };
      records.set(key, record);
      if (records.size > 2000) {
        for (const [k, r] of records) {
          if (now >= r.resetTime) records.delete(k);
        }
      }
      return next();
    }

    record.count++;
    if (record.count > options.max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: options.message || `Too many requests. Please wait ${retryAfterSec} seconds before trying again.`,
        code: "RATE_LIMITED",
      });
      return;
    }

    next();
  };
}

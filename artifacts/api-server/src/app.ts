import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createReadStream, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const app: Express = express();

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow font/image cross-origin
    contentSecurityPolicy: false, // managed by Nginx in production
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://confirmedgrowth.com",
  "https://www.confirmedgrowth.com",
  /^https?:\/\/localhost(:\d+)?$/,
  /\.replit\.dev$/,   // Replit preview domains
  /\.repl\.co$/,
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some(o =>
        typeof o === "string" ? o === origin : o.test(origin),
      );
      if (allowed) return callback(null, true);
      return callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Admin-Token",
      "X-Admin-User",
      "X-Provider-Id",
      "X-Provider-Token",
      "X-Provider-User",
      "X-Tenant-Id",
      "X-Actor-Id",
      "X-Actor-Type",
      "X-Actor-Role",
      "X-Auth-Token",
      "X-Actor-Permissions",
    ],
    credentials: false,
  }),
);

// ── Global Rate Limiting ──────────────────────────────────────────────────────
// General API: 120 req/min per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
  skip: req => req.path === "/health",
});

// OTP send: 10 req/min per IP (brute-force protection)
const otpSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "otp_rate_limited", retryAfter: 60 },
});

// OTP verify: 10 req/min per IP
const otpVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "otp_rate_limited", retryAfter: 60 },
});

app.use("/api", generalLimiter);
app.use("/api/auth/send-otp",   otpSendLimiter);
app.use("/api/auth/verify-otp", otpVerifyLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
// Capture raw body for WhatsApp HMAC-SHA256 webhook signature verification
app.use(express.json({
  limit: "1mb",
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Request Logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Serve Frontend Static Files (production) ─────────────────────────────────
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname2 = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.join(__dirname2, "public");

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  // SPA fallback — serve index.html for all non-API routes
  app.get("*path", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// ── Temporary: serve built backend for production download ───────────────────
app.get("/dl/backend.mjs", (_req, res) => {
  try {
    const filePath = join(dirname(fileURLToPath(import.meta.url)), "index.mjs");
    const stat = statSync(filePath);
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", 'attachment; filename="index.mjs"');
    createReadStream(filePath).pipe(res);
  } catch {
    res.status(404).json({ error: "file_not_found" });
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  const isDev = process.env["NODE_ENV"] !== "production";
  const status = err.status ?? err.statusCode ?? 500;
  logger.error(err, "unhandled error");
  res.status(status).json({
    error: status < 500 ? err.message : "server_error",
    ...(isDev && status >= 500 ? { detail: String(err) } : {}),
  });
});

export default app;

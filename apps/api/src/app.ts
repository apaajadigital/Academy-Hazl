import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";

import { env } from "./config/env.js";
import { errorResponse } from "./types/index.js";
import { EBOOK_UPLOAD_SUBDIR } from "./lib/ebookFile.js";
import { httpLogger } from "./middleware/httpLogger.js";
import { generalLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import certificatesRouter from "./routes/certificates.js";
import coursesRouter from "./routes/courses.js";
import categoriesRouter from "./routes/categories.js";
import searchRouter from "./routes/search.js";
import uploadRouter from "./routes/upload.js";
import enrollmentsRouter from "./routes/enrollments.js";
import progressRouter from "./routes/progress.js";
import quizRouter from "./routes/quiz.js";
import dashboardRouter from "./routes/dashboard.js";
import videosRouter from "./routes/videos.js";
import adminRouter from "./routes/admin.js";
import checkoutRouter from "./routes/checkout.js";
import ordersRouter from "./routes/orders.js";
import couponsRouter from "./routes/coupons.js";
import webhooksRouter from "./routes/webhooks.js";
import ebooksRouter from "./routes/ebooks.js";
import lmsRouter from "./routes/lms.js";
import leadsRouter from "./routes/leads.js";
import testimonialsRouter from "./routes/testimonials.js";
import portfoliosRouter from "./routes/portfolios.js";
import eventsRouter from "./routes/events.js";
import trainerRouter from "./routes/trainer.js";
import reviewsRouter from "./routes/reviews.js";
import blogRouter from "./routes/blog.js";
import affiliateRouter from "./routes/affiliate.js";
import subscriptionRouter from "./routes/subscription.js";

export const app = express();

// Trust proxy for correct IP behind load balancer / Cloudflare
app.set("trust proxy", 1);

// Request logging + X-Request-Id correlation (TASK-023) — before everything else.
app.use(httpLogger);

// Security headers (H6): HSTS, nosniff, frame-guard, referrer-policy, etc.
// CSP is disabled here because this origin serves JSON/assets, not HTML documents
// (CSP is enforced on the web origin in next.config.js). CORP is relaxed to
// cross-origin so the web app (different origin) can load /uploads assets.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
// Capture raw body for webhook signature verification
app.use(
  express.json({
    verify: (req: unknown, _res: unknown, buf: Buffer) => {
      (req as Record<string, unknown>).rawBody = buf;
    },
  })
);
// Duitku's payment callback is application/x-www-form-urlencoded (unlike
// DOKU's JSON) — parsed here so routes/webhooks.ts can read req.body. Express
// dispatches each body parser by Content-Type, so this is additive and does
// not affect any of the JSON routes.
app.use(
  express.urlencoded({
    extended: true,
    verify: (req: unknown, _res: unknown, buf: Buffer) => {
      (req as Record<string, unknown>).rawBody = buf;
    },
  })
);
app.use(cookieParser());
app.use(generalLimiter);

// Convention: every purchase-gated e-book binary lives under
// `<UPLOAD_DIR>/ebooks/`. That directory must NEVER be reachable through the
// unauthenticated static handler below, otherwise anyone who guesses (or is
// told) the path downloads a paid e-book for free. It is served exclusively by
// the signed, short-lived `GET /api/ebooks/:slug/download` endpoint
// (routes/ebooks.ts + lib/ebookFile.ts). Mounted BEFORE express.static so the
// block wins; the rest of /uploads (images, videos) keeps working.
// The comparison MUST run on the decoded + normalised path. Express matches
// `app.use` prefixes against the RAW pathname, while `express.static` decodes and
// normalises before resolving from disk. Mounting the guard at
// `/uploads/${EBOOK_UPLOAD_SUBDIR}` therefore looks correct but is trivially
// bypassed — verified: `/uploads/%65books/x`, `/uploads//ebooks/x` and
// `/uploads/eboo%6Bs/x` all skipped the guard and were served by the static
// handler. Normalising here closes every one of those.
app.use("/uploads", (req, res, next) => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(req.path);
  } catch {
    // A malformed escape sequence cannot be reasoned about — refuse it outright.
    return res.status(400).json(errorResponse("BAD_REQUEST", "Path berkas tidak valid."));
  }
  // Backslashes are folded to `/` first so a Windows-style separator cannot slip
  // a segment past posix.normalize, which collapses `//` and resolves `.`/`..`.
  // Lowercased because the static handler is case-insensitive on Windows/macOS.
  const normalised = path.posix.normalize(decoded.replace(/\\/g, "/")).toLowerCase();
  const blocked =
    normalised === `/${EBOOK_UPLOAD_SUBDIR}` || normalised.startsWith(`/${EBOOK_UPLOAD_SUBDIR}/`);

  if (blocked) {
    return res
      .status(403)
      .json(errorResponse("FORBIDDEN", "Berkas e-book hanya dapat diakses melalui tautan unduhan bertanda tangan."));
  }
  return next();
});

// Serve uploaded files (dev only — use CDN/R2 in production)
//
// `path.resolve`, NOT `path.join`: UPLOAD_DIR is an ABSOLUTE path on the VPS
// (`/app/uploads` in docker-compose.vps.yml) while the container's cwd is
// `/app/apps/api`. `join` concatenates the two into `/app/apps/api/app/uploads`,
// a directory that does not exist — so every file multer wrote to
// `/app/uploads/...` (multer uses `env.UPLOAD_DIR` directly) 404'd in
// production. `resolve` discards the cwd when the second argument is already
// absolute and behaves identically to `join` for the relative dev default
// ("uploads"), which is also what lib/ebookFile.ts already does.
app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.use("/api", healthRouter);
// H2: auth-wide limiter so refresh/reset/verify/OAuth endpoints don't fall
// through to the looser generalLimiter (login/register also stack loginLimiter).
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/users", usersRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/search", searchRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/enrollments", enrollmentsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/videos", videosRouter);
app.use("/api/admin", adminRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/ebooks", ebooksRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/waitlist", leadsRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/portfolios", portfoliosRouter);
app.use("/api/lms", lmsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/trainer", trainerRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/blog", blogRouter);
app.use("/api/affiliate", affiliateRouter);
app.use("/api/subscription", subscriptionRouter);

app.use(notFound);
app.use(errorHandler);

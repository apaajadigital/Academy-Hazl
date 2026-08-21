import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { AppError, successResponse } from "../types/index.js";
import { EBOOK_UPLOAD_SUBDIR } from "../lib/ebookFile.js";
import { env } from "../config/env.js";

const router = Router();

/**
 * Allowed MIME type → the extension the file is STORED with.
 *
 * The stored extension is derived from the (validated) MIME type rather than
 * from `file.originalname`, because the original name is fully attacker
 * controlled and `/uploads` is served by an unauthenticated `express.static`
 * handler. Keeping the client's extension let `evil.html` be uploaded with a
 * declared `image/png` type and then be served back from
 * `/uploads/images/evil.html` as `text/html` — stored XSS on the API origin.
 * A fixed extension per accepted type closes that: whatever the bytes are, the
 * static handler can only ever label them as an image/video/PDF.
 */
const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const VIDEO_EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const DOCUMENT_EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
};

/**
 * E-book binaries are paid content, so they are NOT sized by the generic
 * `MAX_FILE_SIZE_MB` (which is 10 by default and would reject an ordinary
 * book). Fixed here the same way the video limit is, so a dev box and the VPS
 * agree on what an admin can upload.
 */
const MAX_DOCUMENT_SIZE_MB = 50;

function ensureUploadDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Unguessable basename — the ebooks directory relies on it for secrecy too. */
function randomFilename(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}

function diskStorageFor(subdir: string, extByType: Record<string, string>) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(env.UPLOAD_DIR, subdir);
      ensureUploadDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      // `fileFilter` runs first, so the type is always a known key here; the
      // fallback exists only so a future type added to one map and not the
      // other cannot produce an extensionless file.
      cb(null, randomFilename(extByType[file.mimetype] ?? ".bin"));
    },
  });
}

function mimeFilter(extByType: Record<string, string>, message: string): multer.Options["fileFilter"] {
  return (_req, file, cb) => {
    if (extByType[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new AppError(400, message));
    }
  };
}

/** Translate multer's own errors into the shared AppError envelope. */
function runUpload(handler: ReturnType<multer.Multer["single"]>, oversizeMessage: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new AppError(400, oversizeMessage));
        }
        return next(new AppError(400, err.message));
      }
      if (err) return next(err);
      next();
    });
  };
}

/** Respond with the stored path; every endpoint returns the same shape. */
function respondWithFile(urlPrefix: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return next(new AppError(400, "Tidak ada file yang diunggah."));
      const url = `${urlPrefix}/${req.file.filename}`;
      res.status(201).json(successResponse({ url, filename: req.file.filename, size: req.file.size }));
    } catch (err) {
      next(err);
    }
  };
}

const imageUpload = multer({
  storage: diskStorageFor("images", IMAGE_EXT_BY_TYPE),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: mimeFilter(
    IMAGE_EXT_BY_TYPE,
    `Format tidak didukung. Gunakan: ${Object.keys(IMAGE_EXT_BY_TYPE).join(", ")}`,
  ),
});

const videoUpload = multer({
  storage: diskStorageFor("videos", VIDEO_EXT_BY_TYPE),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for video
  fileFilter: mimeFilter(
    VIDEO_EXT_BY_TYPE,
    `Format video tidak didukung. Gunakan: ${Object.keys(VIDEO_EXT_BY_TYPE).join(", ")}`,
  ),
});

const ebookUpload = multer({
  storage: diskStorageFor(EBOOK_UPLOAD_SUBDIR, DOCUMENT_EXT_BY_TYPE),
  limits: { fileSize: MAX_DOCUMENT_SIZE_MB * 1024 * 1024 },
  fileFilter: mimeFilter(DOCUMENT_EXT_BY_TYPE, "Format tidak didukung. Gunakan berkas PDF."),
});

// POST /api/upload/image — trainer or admin
router.post(
  "/image",
  authenticate,
  // H2/M2: uploads must be restricted to trainers/admins, not any logged-in user.
  authorize("trainer", "super_admin"),
  runUpload(imageUpload.single("file"), `File terlalu besar. Maksimal ${env.MAX_FILE_SIZE_MB}MB.`),
  respondWithFile("/uploads/images"),
);

// POST /api/upload/video — trainer or admin
router.post(
  "/video",
  authenticate,
  // H2/M2: uploads must be restricted to trainers/admins, not any logged-in user.
  authorize("trainer", "super_admin"),
  runUpload(videoUpload.single("file"), "File video terlalu besar. Maksimal 500MB."),
  respondWithFile("/uploads/videos"),
);

// POST /api/upload/ebook — admin only.
//
// Lands in `<UPLOAD_DIR>/ebooks/`, the directory app.ts blocks from the static
// handler, so the returned path is only ever downloadable through the signed,
// purchase-gated `GET /api/ebooks/:slug/download`. Storing an e-book anywhere
// else under /uploads would publish paid content to anyone with the URL, which
// is exactly the leak lib/ebookFile.ts was written to close — hence a separate
// endpoint instead of reusing /image with a different filter. Admin-only for
// the same reason: a trainer has no business writing into the paid-content
// directory.
router.post(
  "/ebook",
  authenticate,
  authorize("super_admin"),
  runUpload(ebookUpload.single("file"), `Berkas terlalu besar. Maksimal ${MAX_DOCUMENT_SIZE_MB}MB.`),
  respondWithFile(`/uploads/${EBOOK_UPLOAD_SUBDIR}`),
);

export default router;

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../common/errors/ApiError';

/** Absolute path to the receipt folder (created if it does not exist yet). */
export const uploadsRoot = path.resolve(process.cwd(), env.uploadsDir);

fs.mkdirSync(uploadsRoot, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    // Never trust the client-provided filename.
    const ext = EXTENSION_BY_MIME[file.mimetype] ?? '.jpg';
    cb(null, `receipt-${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

/**
 * Accepts a single optional image in the multipart field `receipt`.
 * Images are capped at MAX_UPLOAD_MB and restricted to real image types.
 */
export const uploadReceipt = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(
        ApiError.badRequest(
          'Receipt must be a JPEG, PNG, WEBP, HEIC or HEIF image.',
          'INVALID_FILE_TYPE',
        ),
      );
      return;
    }
    cb(null, true);
  },
}).single('receipt');

/** Public URL/path persisted on the loan row. */
export const toReceiptUrl = (filename: string): string => {
  const relativePath = `/uploads/${filename}`;
  return env.publicBaseUrl ? `${env.publicBaseUrl}${relativePath}` : relativePath;
};

/** Deletes a receipt from disk, ignoring a missing file. */
export const removeReceiptFile = (receiptUrl: string | null): void => {
  if (!receiptUrl) return;

  try {
    const pathname = new URL(receiptUrl, 'http://localhost').pathname;
    if (!pathname.startsWith('/uploads/')) return;

    const filename = path.basename(pathname);
    fs.promises.unlink(path.join(uploadsRoot, filename)).catch(() => undefined);
  } catch {
    // A malformed URL should never make a delete fail.
  }
};

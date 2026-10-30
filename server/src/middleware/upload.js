const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = env.UPLOAD_DIR;
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path
      .extname(file.originalname || '')
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    cb(null, `${crypto.randomUUID()}${ext || '.bin'}`);
  },
});

const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function fileFilter(req, file, cb) {
  if (!ALLOWED.has(file.mimetype)) {
    return cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Only PDF, JPG or PNG files are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
});

function csvFileFilter(req, file, cb) {
  const okMime = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'].includes(
    file.mimetype
  );
  const okExt = path.extname(file.originalname || '').toLowerCase() === '.csv';
  if (!okMime && !okExt)
    return cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Only CSV files are allowed'));
  cb(null, true);
}

const csvUpload = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function validateMagicBytes(req, res, next) {
  if (!req.file) return next(new ApiError(400, 'FILE_REQUIRED', 'Proof file is required'));
  try {
    const fd = fs.openSync(req.file.path, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    const mime = req.file.mimetype;
    let ok = false;
    if (mime === 'application/pdf') ok = buf.slice(0, 4).toString('ascii') === '%PDF';
    else if (mime === 'image/jpeg') ok = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    else if (mime === 'image/png')
      ok = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (!ok) {
      fs.unlinkSync(req.file.path);
      return next(
        new ApiError(400, 'INVALID_FILE_CONTENT', 'File content does not match its declared type')
      );
    }
    req.file.hash = sha256File(req.file.path);
    // Virus-scan hook placeholder: wire ClamAV here in production.
    next();
  } catch (e) {
    return next(e);
  }
}

function removeFileQuietly(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    // ignore
  }
}

module.exports = {
  upload,
  csvUpload,
  validateMagicBytes,
  sha256File,
  removeFileQuietly,
  UPLOAD_DIR,
};

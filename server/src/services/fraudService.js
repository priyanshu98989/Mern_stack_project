const Certificate = require('../models/Certificate');
const { escapeRegex } = require('../utils/pagination');

const LABELS = {
  DUPLICATE_FILE_HASH: 'Same proof file has already been uploaded',
  CROSS_USER_DUPLICATE_CERT_ID: 'This certificate ID is used by another student',
  DUPLICATE_CERTIFICATE_ID: 'This certificate ID already exists in your records',
  NEAR_DUPLICATE_COURSE_DATE: 'A very similar course with the same end date already exists',
  OCR_NAME_MISMATCH: 'Name extracted from the document does not match your account name',
  INVALID_URL: 'Certificate URL is not a valid URL',
  INVALID_URL_PROTOCOL: 'Certificate URL must use http or https',
  PLATFORM_DOMAIN_MISMATCH: 'Certificate URL domain does not belong to the selected platform',
  MISSING_PROOF: 'No proof document uploaded',
};

const WEIGHTS = {
  DUPLICATE_FILE_HASH: 40,
  CROSS_USER_DUPLICATE_CERT_ID: 40,
  DUPLICATE_CERTIFICATE_ID: 25,
  NEAR_DUPLICATE_COURSE_DATE: 20,
  OCR_NAME_MISMATCH: 25,
  INVALID_URL: 10,
  INVALID_URL_PROTOCOL: 10,
  PLATFORM_DOMAIN_MISMATCH: 10,
  MISSING_PROOF: 10,
};

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(intro|introduction|basics|fundamentals|essentials|complete|beginners?)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function add(reasons, code) {
  if (!reasons.includes(code)) reasons.push(code);
}

async function computeTrust(cert, { platform = null } = {}) {
  const reasons = [];
  const ids = [];

  if (cert.proof && cert.proof.hash) {
    const dupFile = await Certificate.findOne({
      'proof.hash': cert.proof.hash,
      _id: { $ne: cert._id },
    })
      .select('_id student')
      .lean();
    if (dupFile) {
      add(reasons, 'DUPLICATE_FILE_HASH');
      ids.push(dupFile._id);
    }
  } else {
    add(reasons, 'MISSING_PROOF');
  }

  if (cert.certificateIdNormalized || cert.certificateId) {
    const normalized = String(cert.certificateIdNormalized || cert.certificateId)
      .replace(/\s+/g, '')
      .toUpperCase();
    const sameId = await Certificate.find({
      certificateIdNormalized: normalized,
      _id: { $ne: cert._id },
    })
      .select('_id student')
      .lean();
    for (const row of sameId) {
      if (String(row.student) !== String(cert.student)) {
        add(reasons, 'CROSS_USER_DUPLICATE_CERT_ID');
      } else {
        add(reasons, 'DUPLICATE_CERTIFICATE_ID');
      }
      ids.push(row._id);
    }
  }

  if (cert.student && cert.title && cert.endDate) {
    const start = new Date(cert.endDate);
    start.setDate(start.getDate() - 7);
    const end = new Date(cert.endDate);
    end.setDate(end.getDate() + 7);
    const near = await Certificate.findOne({
      student: cert.student,
      endDate: { $gte: start, $lte: end },
      title: { $regex: new RegExp(escapeRegex(normalizeTitle(cert.title)), 'i') },
      _id: { $ne: cert._id },
    })
      .select('_id')
      .lean();
    if (near) {
      add(reasons, 'NEAR_DUPLICATE_COURSE_DATE');
      ids.push(near._id);
    }
  }

  if (cert.ocrSuggestions && cert.ocrSuggestions.nameMismatch) {
    add(reasons, 'OCR_NAME_MISMATCH');
  }

  if (cert.certificateUrl) {
    try {
      const url = new URL(cert.certificateUrl);
      if (!['http:', 'https:'].includes(url.protocol)) add(reasons, 'INVALID_URL_PROTOCOL');
      const domains = platform && Array.isArray(platform.domains) ? platform.domains : [];
      if (
        domains.length &&
        !domains.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))
      ) {
        add(reasons, 'PLATFORM_DOMAIN_MISMATCH');
      }
    } catch (e) {
      add(reasons, 'INVALID_URL');
    }
  }

  let score = 100;
  for (const code of reasons) score -= WEIGHTS[code] || 5;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reasons,
    labels: reasons.map((r) => LABELS[r] || r),
    duplicateOf: ids[0] || null,
    level: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
  };
}

module.exports = { computeTrust, LABELS, WEIGHTS, normalizeTitle };

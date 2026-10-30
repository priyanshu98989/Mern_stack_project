const fs = require('fs');
const logger = require('../config/logger');

async function pdfToText(buffer) {
  const mod = require('pdf-parse');
  if (mod && typeof mod.PDFParse === 'function') {
    const parser = new mod.PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      return (data && data.text) || '';
    } finally {
      if (typeof parser.destroy === 'function') await parser.destroy().catch(() => {});
    }
  }
  if (typeof mod === 'function') {
    const data = await mod(buffer);
    return data.text || '';
  }
  if (mod && typeof mod.pdf === 'function') {
    const data = await mod.pdf(buffer);
    return data.text || '';
  }
  if (mod && mod.default && typeof mod.default === 'function') {
    const data = await mod.default(buffer);
    return data.text || '';
  }
  throw new Error('Unsupported pdf-parse module shape');
}

async function extractText(filePath, mimetype) {
  try {
    if (mimetype === 'application/pdf') {
      const buffer = fs.readFileSync(filePath);
      return await pdfToText(buffer);
    }
    if (mimetype && mimetype.startsWith('image/')) {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      try {
        const { data } = await worker.recognize(filePath);
        return data.text || '';
      } finally {
        await worker.terminate();
      }
    }
    return '';
  } catch (err) {
    logger.warn({ err: err.message, filePath }, '[ocr] text extraction failed');
    return '';
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function suggestFromText(text) {
  const out = { source: 'regex', textLength: String(text || '').length };
  if (!text) return out;
  const clean = String(text);

  const idMatch = clean.match(
    /(?:certificate|cert|credential|id|no\.?|number)[:\s#-]*([A-Z0-9][A-Z0-9-]{5,})/i
  );
  if (idMatch) out.certificateId = idMatch[1].trim();

  const dateMatches = clean.match(
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi
  );
  if (dateMatches && dateMatches.length) {
    out.dates = dateMatches.slice(0, 5).map(normalizeDate).filter(Boolean);
    out.startDate = out.dates[0] || null;
    out.endDate = out.dates[1] || out.dates[0] || null;
  }

  const nameMatch = clean.match(
    /(?:awarded to|certify that|presented to|this is to certify that|successfully completed by)\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,3})/i
  );
  if (nameMatch) out.learnerName = nameMatch[1].trim();

  const scoreMatch = clean.match(/(?:score|percentage|marks)[:\s-]*(\d{1,3})(?:\.\d+)?\s*%?/i);
  if (scoreMatch) out.score = Number(scoreMatch[1]);

  const gradeMatch = clean.match(
    /(?:grade|result)[:\s-]*([A-F][+-]?|Pass|Distinction|First Class)/i
  );
  if (gradeMatch) out.grade = gradeMatch[1];

  const weeksMatch = clean.match(/(\d{1,2})\s*(?:weeks|week)/i);
  const hoursMatch = clean.match(/(\d{1,4})\s*(?:hours|hrs|hour)/i);
  if (weeksMatch) out.durationWeeks = Number(weeksMatch[1]);
  if (hoursMatch) out.durationHours = Number(hoursMatch[1]);

  const platformNames = [
    'NPTEL',
    'Coursera',
    'Udemy',
    'edX',
    'Swayam',
    'Great Learning',
    'Simplilearn',
    'Google',
    'Microsoft',
    'AWS',
    'IBM',
  ];
  const foundPlatform = platformNames.find((p) => clean.toLowerCase().includes(p.toLowerCase()));
  if (foundPlatform) out.platform = foundPlatform;

  const lines = clean
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 160);
  if (lines.length) out.courseTitle = lines[0].slice(0, 160);

  const skills = [
    'React',
    'Node.js',
    'MongoDB',
    'Python',
    'Java',
    'Machine Learning',
    'Data Science',
    'Cloud',
    'AWS',
    'Docker',
    'Kubernetes',
    'SQL',
    'TypeScript',
    'JavaScript',
    'Cyber Security',
    'IoT',
    'Deep Learning',
    'HTML',
    'CSS',
    'Git',
    'Linux',
    'Excel',
    'Communication',
  ];
  out.skillTags = skills.filter((s) => clean.toLowerCase().includes(s.toLowerCase())).slice(0, 10);

  return out;
}

function nameMatchesAccount(learnerName, accountName) {
  if (!learnerName || !accountName) return true;
  const a = learnerName
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const b = accountName
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (!a.length || !b.length) return true;
  return a.some((part) => b.includes(part)) || b.some((part) => a.includes(part));
}

module.exports = { extractText, suggestFromText, nameMatchesAccount, normalizeDate };

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Certificate = require('../models/Certificate');
const CreditLedger = require('../models/CreditLedger');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { toCsv } = require('../utils/csv');

function dateOnly(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function buildCertificateQuery({
  scopeIds,
  status,
  department,
  platform,
  semester,
  from,
  to,
  search,
}) {
  const q = {};
  if (scopeIds) q.student = { $in: scopeIds };
  if (status) q.status = status;
  if (department) q.departmentSnapshot = department;
  if (platform) q.platform = platform;
  if (semester) q.semesterKey = semester;
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ title: rx }, { certificateId: rx }, { platformName: rx }];
  }
  return q;
}

async function certificateRows(filters = {}, { limit = 5000 } = {}) {
  const q = buildCertificateQuery(filters);
  const rows = await Certificate.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('student', 'name email department batch rollNumber')
    .lean();
  return rows.map((c) => ({
    certificateId: c.verificationId || c.certificateId || String(c._id),
    studentName: c.student?.name || '',
    studentEmail: c.student?.email || '',
    department: c.departmentSnapshot || c.student?.department || '',
    batch: c.batchSnapshot || c.student?.batch || '',
    title: c.title,
    platform: c.platformName || '',
    institute: c.institute || '',
    startDate: dateOnly(c.startDate),
    endDate: dateOnly(c.endDate),
    durationWeeks: c.durationWeeks || 0,
    durationHours: c.durationHours || 0,
    grade: c.grade || '',
    score: c.score != null ? c.score : '',
    semester: c.semesterKey || c.semester || '',
    status: c.status,
    credits: c.creditsAwarded || 0,
    trustScore: c.trustScore,
    submittedAt: dateOnly(c.submittedAt),
    verifiedAt: dateOnly(c.verifiedAt),
  }));
}

const CERT_HEADERS = [
  'certificateId',
  'studentName',
  'studentEmail',
  'department',
  'batch',
  'title',
  'platform',
  'institute',
  'startDate',
  'endDate',
  'durationWeeks',
  'durationHours',
  'grade',
  'score',
  'semester',
  'status',
  'credits',
  'trustScore',
  'submittedAt',
  'verifiedAt',
];

async function departmentReport(department) {
  const students = await User.find({ role: 'student', department })
    .select('_id name email batch')
    .lean();
  const ids = students.map((s) => s._id);
  const certs = await Certificate.find({ student: { $in: ids } }).lean();
  const ledgers = await CreditLedger.find({ user: { $in: ids } }).lean();
  const creditsByStudent = new Map();
  for (const row of ledgers) {
    const key = String(row.user);
    creditsByStudent.set(key, (creditsByStudent.get(key) || 0) + row.credits);
  }
  const byBatch = new Map();
  for (const s of students) {
    const key = s.batch || 'Unassigned';
    if (!byBatch.has(key))
      byBatch.set(key, { batch: key, students: 0, certificates: 0, credits: 0, approved: 0 });
    const bucket = byBatch.get(key);
    bucket.students += 1;
    bucket.credits += creditsByStudent.get(String(s._id)) || 0;
  }
  for (const c of certs) {
    const student = students.find((s) => String(s._id) === String(c.student));
    const key = student?.batch || 'Unassigned';
    const bucket = byBatch.get(key);
    if (bucket) {
      bucket.certificates += 1;
      if (c.status === 'APPROVED') bucket.approved += 1;
    }
  }
  return {
    department,
    generatedAt: new Date().toISOString(),
    totals: {
      students: students.length,
      certificates: certs.length,
      approved: certs.filter((c) => c.status === 'APPROVED').length,
      pending: certs.filter((c) => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length,
      rejected: certs.filter((c) => c.status === 'REJECTED').length,
      credits: certs.reduce((sum, c) => sum + (c.creditsAwarded || 0), 0),
    },
    byBatch: [...byBatch.values()].sort((a, b) => a.batch.localeCompare(b.batch)),
    topStudents: students
      .map((s) => ({
        name: s.name,
        email: s.email,
        batch: s.batch,
        credits: creditsByStudent.get(String(s._id)) || 0,
        certificates: certs.filter(
          (c) => String(c.student) === String(s._id) && c.status === 'APPROVED'
        ).length,
      }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 20),
  };
}

async function transcript(studentId) {
  const student = await User.findById(studentId)
    .select('name email department batch rollNumber')
    .lean();
  if (!student) return null;
  const [certs, ledgers] = await Promise.all([
    Certificate.find({ student: studentId, status: 'APPROVED' }).sort({ verifiedAt: 1 }).lean(),
    CreditLedger.find({ user: studentId }).sort({ createdAt: 1 }).lean(),
  ]);
  const total = ledgers.reduce((sum, r) => sum + r.credits, 0);
  const bySemester = new Map();
  for (const c of certs) {
    const key = c.semesterKey || c.semester || 'Unassigned';
    if (!bySemester.has(key)) bySemester.set(key, { semester: key, certificates: 0, credits: 0 });
    const b = bySemester.get(key);
    b.certificates += 1;
    b.credits += c.creditsAwarded || 0;
  }
  return {
    student: {
      name: student.name,
      email: student.email,
      department: student.department,
      batch: student.batch,
    },
    totalCredits: total,
    bySemester: [...bySemester.values()],
    certificates: certs.map((c) => ({
      title: c.title,
      platform: c.platformName,
      verifiedAt: dateOnly(c.verifiedAt),
      semester: c.semesterKey || c.semester,
      credits: c.creditsAwarded || 0,
      verificationId: c.verificationId,
    })),
    ledger: ledgers.map((r) => ({
      date: dateOnly(r.createdAt),
      type: r.type,
      credits: r.credits,
      note: r.note,
      rule: r.ruleName,
    })),
  };
}

async function auditRows({ department, actor, action, from, to } = {}) {
  const q = {};
  if (department) q.actorDepartment = department;
  if (actor) q.actor = actor;
  if (action) q.action = new RegExp(String(action).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }
  const rows = await AuditLog.find(q)
    .sort({ createdAt: -1 })
    .limit(10000)
    .populate('actor', 'name email role')
    .lean();
  return rows.map((r) => ({
    time: new Date(r.createdAt).toISOString(),
    actor: r.actor?.name || '',
    role: r.actor?.role || r.actorRole || '',
    action: r.action,
    resource: r.resource,
    resourceId: r.resourceId,
    ip: r.ip,
    requestId: r.requestId,
    diff: r.diff ? JSON.stringify(r.diff) : '',
  }));
}

async function toXlsxBuffer(sheets) {
  const wb = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name.slice(0, 31));
    if (rows.length) {
      const headers = Object.keys(rows[0]);
      ws.columns = headers.map((header) => ({
        header,
        key: header,
        width: Math.min(40, Math.max(12, header.length + 4)),
      }));
      for (const row of rows) ws.addRow(row);
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function tablePdf({ title, subtitle, columns, rows }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 32 });
      const chunks = [];
      doc.on('data', (d) => chunks.push(d));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(16).text(title, { align: 'left' });
      doc.moveDown(0.25);
      doc.fontSize(9).fillColor('#444').text(subtitle);
      doc.moveDown(0.75);
      const pageWidth = doc.page.width - 64;
      const colWidth = pageWidth / columns.length;
      let y = doc.y;
      const drawRow = (values, bold = false) => {
        if (y > doc.page.height - 50) {
          doc.addPage();
          y = 40;
        }
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(7)
          .fillColor('#111');
        values.forEach((value, i) => {
          doc.text(String(value ?? ''), 32 + i * colWidth, y, {
            width: colWidth - 4,
            height: 10,
            ellipsis: true,
          });
        });
        y += 13;
      };
      drawRow(columns, true);
      doc
        .moveTo(32, y - 4)
        .lineTo(doc.page.width - 32, y - 4)
        .strokeColor('#999')
        .stroke();
      for (const row of rows) drawRow(columns.map((c) => row[c]));
      doc
        .fontSize(7)
        .fillColor('#666')
        .text(`Generated ${new Date().toISOString()} - CertTrack`, 32, doc.page.height - 30);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function exportCertificates(format, filters = {}) {
  const rows = await certificateRows(filters);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    return {
      buffer: Buffer.from(toCsv(rows, CERT_HEADERS), 'utf8'),
      filename: `certificates-${stamp}.csv`,
      contentType: 'text/csv',
    };
  }
  if (format === 'xlsx') {
    return {
      buffer: await toXlsxBuffer({ Certificates: rows }),
      filename: `certificates-${stamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  const buffer = await tablePdf({
    title: 'Certificate Report',
    subtitle: `${rows.length} certificate(s) - generated ${new Date().toLocaleString()}`,
    columns: [
      'studentName',
      'title',
      'platform',
      'department',
      'semester',
      'status',
      'credits',
      'verifiedAt',
    ],
    rows,
  });
  return { buffer, filename: `certificates-${stamp}.pdf`, contentType: 'application/pdf' };
}

async function exportDepartment(department, format) {
  const report = await departmentReport(department);
  const rows = report.topStudents;
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'xlsx') {
    return {
      buffer: await toXlsxBuffer({
        Summary: [report.totals],
        Batches: report.byBatch,
        Students: rows,
      }),
      filename: `department-${department}-${stamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  if (format === 'csv') {
    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      filename: `department-${department}-${stamp}.csv`,
      contentType: 'text/csv',
    };
  }
  const buffer = await tablePdf({
    title: `Department Report: ${department}`,
    subtitle: JSON.stringify(report.totals),
    columns: ['name', 'email', 'batch', 'certificates', 'credits'],
    rows,
  });
  return {
    buffer,
    filename: `department-${department}-${stamp}.pdf`,
    contentType: 'application/pdf',
  };
}

async function exportTranscript(studentId, format) {
  const data = await transcript(studentId);
  if (!data) return null;
  const rows = data.certificates;
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      filename: `transcript-${studentId}-${stamp}.csv`,
      contentType: 'text/csv',
    };
  }
  if (format === 'xlsx') {
    return {
      buffer: await toXlsxBuffer({
        Certificates: rows,
        Ledger: data.ledger,
        Summary: [data.student, { totalCredits: data.totalCredits }],
      }),
      filename: `transcript-${studentId}-${stamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  const buffer = await tablePdf({
    title: `Credit Transcript: ${data.student.name}`,
    subtitle: `${data.student.email} - ${data.student.department} ${data.student.batch} - Total credits: ${data.totalCredits}`,
    columns: ['title', 'platform', 'semester', 'credits', 'verifiedAt', 'verificationId'],
    rows,
  });
  return {
    buffer,
    filename: `transcript-${studentId}-${stamp}.pdf`,
    contentType: 'application/pdf',
  };
}

async function exportAudit(filters, format) {
  const rows = await auditRows(filters);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'xlsx') {
    return {
      buffer: await toXlsxBuffer({ Audit: rows }),
      filename: `audit-${stamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  return {
    buffer: Buffer.from(toCsv(rows), 'utf8'),
    filename: `audit-${stamp}.csv`,
    contentType: 'text/csv',
  };
}

module.exports = {
  buildCertificateQuery,
  certificateRows,
  CERT_HEADERS,
  departmentReport,
  transcript,
  auditRows,
  toXlsxBuffer,
  tablePdf,
  exportCertificates,
  exportDepartment,
  exportTranscript,
  exportAudit,
};

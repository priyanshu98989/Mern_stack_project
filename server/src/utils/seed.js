const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { connectDB, disconnectDB } = require('../config/db');
const env = require('../config/env');
const User = require('../models/User');
const Platform = require('../models/Platform');
const CreditRule = require('../models/CreditRule');
const CreditLedger = require('../models/CreditLedger');
const Certificate = require('../models/Certificate');
const StatusHistory = require('../models/StatusHistory');
const FacultyAssignment = require('../models/FacultyAssignment');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const AuditLog = require('../models/AuditLog');
const Setting = require('../models/Setting');
const FeatureFlag = require('../models/FeatureFlag');
const { Department, Batch } = require('../models/Org');
const creditService = require('../services/creditService');
const cryptoService = require('../services/cryptoService');
const certificateService = require('../services/certificateService');
const qrService = require('../services/qrService');

const PLATFORMS = [
  { name: 'NPTEL', slug: 'nptel', domains: ['nptel.ac.in'], website: 'https://nptel.ac.in' },
  {
    name: 'Coursera',
    slug: 'coursera',
    domains: ['coursera.org'],
    website: 'https://coursera.org',
  },
  { name: 'Udemy', slug: 'udemy', domains: ['udemy.com'], website: 'https://udemy.com' },
  { name: 'edX', slug: 'edx', domains: ['edx.org'], website: 'https://edx.org' },
  { name: 'Swayam', slug: 'swayam', domains: ['swayam.gov.in'], website: 'https://swayam.gov.in' },
  {
    name: 'Google',
    slug: 'google',
    domains: ['google.com', 'cloud.google.com'],
    website: 'https://grow.google',
  },
  {
    name: 'AWS',
    slug: 'aws',
    domains: ['aws.amazon.com'],
    website: 'https://aws.amazon.com/training',
  },
  {
    name: 'IBM',
    slug: 'ibm',
    domains: ['ibm.com', 'skillsbuild.org'],
    website: 'https://skillsbuild.org',
  },
];

const COURSES = [
  {
    title: 'Full Stack Web Development with MERN',
    platform: 'Coursera',
    weeks: 12,
    skills: ['React', 'Node.js', 'MongoDB', 'JavaScript'],
  },
  {
    title: 'The Complete React Developer Course',
    platform: 'Udemy',
    weeks: 8,
    skills: ['React', 'JavaScript', 'HTML', 'CSS'],
  },
  {
    title: 'Node.js, Express and MongoDB Bootcamp',
    platform: 'Udemy',
    weeks: 10,
    skills: ['Node.js', 'MongoDB', 'REST APIs'],
  },
  {
    title: 'Python for Data Science',
    platform: 'NPTEL',
    weeks: 12,
    skills: ['Python', 'Data Science', 'Pandas'],
  },
  {
    title: 'Machine Learning Specialization',
    platform: 'Coursera',
    weeks: 16,
    skills: ['Machine Learning', 'Python', 'Statistics'],
  },
  {
    title: 'Deep Learning Specialization',
    platform: 'Coursera',
    weeks: 16,
    skills: ['Deep Learning', 'Python', 'Machine Learning'],
  },
  {
    title: 'AWS Cloud Practitioner Essentials',
    platform: 'AWS',
    weeks: 6,
    skills: ['AWS', 'Cloud', 'Linux'],
  },
  {
    title: 'Google Data Analytics',
    platform: 'Google',
    weeks: 24,
    skills: ['SQL', 'Data Science', 'Excel'],
  },
  {
    title: 'Introduction to Cyber Security',
    platform: 'NPTEL',
    weeks: 8,
    skills: ['Cyber Security', 'Networking', 'Linux'],
  },
  {
    title: 'Docker and Kubernetes: The Practical Guide',
    platform: 'Udemy',
    weeks: 10,
    skills: ['Docker', 'Kubernetes', 'DevOps'],
  },
  { title: 'SQL for Data Analysis', platform: 'edX', weeks: 6, skills: ['SQL', 'Data Science'] },
  {
    title: 'Web Development Fundamentals',
    platform: 'Swayam',
    weeks: 8,
    skills: ['HTML', 'CSS', 'JavaScript'],
  },
  {
    title: 'Cloud Computing Fundamentals',
    platform: 'IBM',
    weeks: 6,
    skills: ['Cloud', 'Linux', 'Networking'],
  },
  {
    title: 'Java Programming Masterclass',
    platform: 'Udemy',
    weeks: 14,
    skills: ['Java', 'Object Oriented Programming'],
  },
  {
    title: 'Data Structures and Algorithms',
    platform: 'NPTEL',
    weeks: 12,
    skills: ['C++', 'Algorithms', 'Problem Solving'],
  },
  {
    title: 'Introduction to Internet of Things',
    platform: 'NPTEL',
    weeks: 8,
    skills: ['IoT', 'Embedded Systems', 'Networking'],
  },
  {
    title: 'Git and GitHub Complete Guide',
    platform: 'Udemy',
    weeks: 4,
    skills: ['Git', 'Version Control'],
  },
  {
    title: 'TypeScript Fundamentals',
    platform: 'edX',
    weeks: 5,
    skills: ['TypeScript', 'JavaScript'],
  },
  {
    title: 'Google Cloud Fundamentals',
    platform: 'Google',
    weeks: 6,
    skills: ['Cloud', 'Google Cloud', 'Linux'],
  },
  {
    title: 'IBM SkillsBuild: Artificial Intelligence',
    platform: 'IBM',
    weeks: 5,
    skills: ['Artificial Intelligence', 'Python'],
  },
  {
    title: 'Design and Analysis of Algorithms',
    platform: 'NPTEL',
    weeks: 12,
    skills: ['Algorithms', 'Problem Solving'],
  },
  {
    title: 'Advanced React and Redux',
    platform: 'Coursera',
    weeks: 8,
    skills: ['React', 'Redux', 'JavaScript'],
  },
  {
    title: 'Linux Command Line Bootcamp',
    platform: 'Udemy',
    weeks: 6,
    skills: ['Linux', 'Shell Scripting'],
  },
  {
    title: 'Database Management Systems',
    platform: 'Swayam',
    weeks: 10,
    skills: ['SQL', 'Database', 'Data Modeling'],
  },
  {
    title: 'Communication and Soft Skills',
    platform: 'Swayam',
    weeks: 4,
    skills: ['Communication', 'Presentation'],
  },
];

const STUDENT_NAMES = [
  'Aarav Sharma',
  'Ananya Verma',
  'Rohan Patel',
  'Ishita Nair',
  'Kabir Singh',
  'Meera Iyer',
  'Vivaan Gupta',
  'Saanvi Reddy',
  'Arjun Deshmukh',
  'Diya Kapoor',
  'Aditya Rao',
  'Neha Joshi',
  'Karan Malhotra',
  'Riya Bansal',
  'Siddharth Menon',
  'Tanvi Kulkarni',
  'Yash Chauhan',
  'Pooja Mishra',
  'Devansh Jain',
  'Nisha Pillai',
];

const FACULTY = [
  { name: 'Dr. Kavita Rao', email: 'faculty1@certtrack.local' },
  { name: 'Prof. Sanjay Mehta', email: 'faculty2@certtrack.local' },
  { name: 'Dr. Priya Krishnan', email: 'faculty3@certtrack.local' },
];

function at(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(10, 0, 0, 0);
  return d;
}

function semesterOf(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth() >= 6 ? 'ODD' : 'EVEN'}`;
}

function makePdf(lines) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(22).text('Certificate of Completion', { align: 'center' });
    doc.moveDown(1.2);
    lines.forEach((line) => doc.fontSize(12).text(line, { align: 'center' }));
    doc.moveDown(1);
    doc.fontSize(10).text('This certificate is issued for successful completion of the course.', {
      align: 'center',
    });
    doc.end();
  });
}

async function makeProof(student, course, certId) {
  const buffer = await makePdf([
    `This is to certify that ${student.name}`,
    `has successfully completed ${course.title}`,
    `offered by ${course.platform}`,
    `Certificate ID: ${certId}`,
    `Duration: ${course.weeks} weeks`,
  ]);
  const filename = `seed-${certId.replace(/[^A-Za-z0-9-]/g, '')}.pdf`;
  fs.writeFileSync(path.join(env.UPLOAD_DIR, filename), buffer);
  return {
    url: `/uploads/${filename}`,
    filename,
    mimetype: 'application/pdf',
    size: buffer.length,
    hash: crypto.createHash('sha256').update(buffer).digest('hex'),
    uploadedAt: new Date(),
  };
}

async function upsertUser({
  name,
  email,
  role,
  password,
  department,
  batch,
  emailVerified = true,
}) {
  let user = await User.findOne({ email });
  if (!user) user = new User({ email });
  user.name = name;
  user.role = role;
  user.password = password;
  user.department = department;
  user.batch = batch || '';
  user.status = 'active';
  user.emailVerified = emailVerified;
  user.deletedAt = null;
  await user.save();
  return user;
}

async function clearDemoData() {
  await Promise.all([
    Certificate.deleteMany({}),
    CreditLedger.collection.deleteMany({}),
    StatusHistory.deleteMany({}),
    User.deleteMany({ email: /@certtrack\.local$/i }),
    FacultyAssignment.deleteMany({}),
    Notification.deleteMany({}),
    Comment.deleteMany({}),
    AuditLog.deleteMany({}),
    CreditRule.deleteMany({}),
    Setting.deleteMany({}),
    FeatureFlag.deleteMany({}),
    Department.deleteMany({}),
    Batch.deleteMany({}),
  ]);
  if (fs.existsSync(env.UPLOAD_DIR)) {
    for (const f of fs.readdirSync(env.UPLOAD_DIR)) {
      if (f.startsWith('seed-')) fs.unlinkSync(path.join(env.UPLOAD_DIR, f));
    }
  }
}

async function seed({ reset = false } = {}) {
  await connectDB();
  if (reset) {
    await mongoose.connection.dropDatabase();
    console.log('[seed] database dropped');
  } else {
    const existing = await Certificate.estimatedDocumentCount();
    if (existing > 0) {
      throw new Error(
        `Database already contains ${existing} certificate(s). Re-run with --reset to wipe the database and reseed.`
      );
    }
  }
  await clearDemoData();
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

  const dept = await Department.create({
    name: 'Computer Science and Engineering',
    code: 'CSE',
    active: true,
  });
  const itDept = await Department.create({
    name: 'Information Technology',
    code: 'IT',
    active: true,
  });
  await Batch.create([
    { name: '2023-2027', department: dept._id, year: 2023 },
    { name: '2024-2028', department: dept._id, year: 2024 },
    { name: '2025-2029', department: itDept._id, year: 2025 },
  ]);

  const admin = await upsertUser({
    name: 'CertTrack Admin',
    email: 'admin@certtrack.local',
    role: 'admin',
    password: 'Admin@12345',
    department: 'Administration',
  });
  const hod = await upsertUser({
    name: 'Dr. Ramesh Iyer',
    email: 'hod.cse@certtrack.local',
    role: 'hod',
    password: 'Hod@12345',
    department: 'CSE',
  });
  const faculty = [];
  for (const f of FACULTY) {
    faculty.push(
      await upsertUser({ ...f, role: 'faculty', password: 'Faculty@12345', department: 'CSE' })
    );
  }

  const students = [];
  for (let i = 0; i < STUDENT_NAMES.length; i += 1) {
    const name = STUDENT_NAMES[i];
    const email = `student${i + 1}@certtrack.local`;
    students.push(
      await upsertUser({
        name,
        email,
        role: 'student',
        password: 'Student@12345',
        department: 'CSE',
        batch: i < 10 ? '2023-2027' : '2024-2028',
      })
    );
  }

  for (let i = 0; i < students.length; i += 1) {
    await FacultyAssignment.create({
      faculty: faculty[i % faculty.length]._id,
      student: students[i]._id,
      assignedBy: hod._id,
    });
  }

  const platforms = [];
  for (const p of PLATFORMS) {
    platforms.push(
      await Platform.findOneAndUpdate(
        { slug: p.slug },
        { ...p, active: true, createdBy: admin._id },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
    );
  }
  const platformByName = new Map(platforms.map((p) => [p.name, p]));

  const ruleBase = {
    criteria: { minDurationWeeks: 0, minDurationHours: 0, minScore: 0, grades: [] },
    effectiveFrom: new Date('2020-01-01'),
    isActive: true,
    createdBy: admin._id,
  };
  await CreditRule.create([
    {
      ...ruleBase,
      ruleKey: 'workshop-short',
      name: 'Short workshop / micro-course',
      credits: 1,
      perSemesterCap: 12,
      perPlatformCap: 8,
      version: 1,
    },
    {
      ...ruleBase,
      ruleKey: 'standard-course',
      name: 'Standard course (4+ weeks)',
      criteria: { ...ruleBase.criteria, minDurationWeeks: 4 },
      credits: 2,
      perSemesterCap: 12,
      perPlatformCap: 8,
      version: 1,
    },
    {
      ...ruleBase,
      ruleKey: 'long-course',
      name: 'Long course (8+ weeks)',
      criteria: { ...ruleBase.criteria, minDurationWeeks: 8 },
      credits: 3,
      perSemesterCap: 12,
      perPlatformCap: 8,
      version: 1,
    },
    {
      ...ruleBase,
      ruleKey: 'nptel-elite',
      name: 'NPTEL elite (8+ weeks, 70%+)',
      platform: platformByName.get('NPTEL')._id,
      criteria: { ...ruleBase.criteria, minDurationWeeks: 8, minScore: 70 },
      credits: 4,
      perSemesterCap: 12,
      perPlatformCap: 8,
      version: 1,
    },
  ]);

  for (const [key, value] of Object.entries({
    institutionName: 'CertTrack College',
    requiredCredits: 20,
    slaRemindDays: 3,
    slaEscalateDays: 7,
    allowSelfRegister: true,
    maintenanceMode: false,
    maxCertificatesPerSemester: 20,
    aiEnabled: true,
    ocrAutoRun: true,
  })) {
    await Setting.create({ key, value, updatedBy: admin._id });
  }
  await FeatureFlag.create([
    {
      key: 'ai_enabled',
      enabled: true,
      description: 'AI extraction and copilot features',
      updatedBy: admin._id,
    },
    {
      key: 'ocr_enabled',
      enabled: true,
      description: 'OCR extraction for uploaded proofs',
      updatedBy: admin._id,
    },
    {
      key: 'google_oauth',
      enabled: false,
      description: 'Google OAuth sign-in',
      updatedBy: admin._id,
    },
    {
      key: 'maintenance_mode',
      enabled: false,
      description: 'Read-only maintenance mode',
      updatedBy: admin._id,
    },
  ]);

  const counts = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    NEEDS_CHANGES: 0,
  };
  let certCounter = 0;
  let approvedSeen = 0;
  const submittedForComments = [];

  for (let s = 0; s < students.length; s += 1) {
    const student = students[s];
    const assignedFaculty = faculty[s % faculty.length];
    for (let j = 0; j < 5; j += 1) {
      const course = COURSES[(s * 3 + j * 7) % COURSES.length];
      const platform = platformByName.get(course.platform);
      const statuses = [];
      if (j <= 2) statuses.push('APPROVED');
      else if (j === 3)
        statuses.push(
          ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'REJECTED'][s % 5]
        );
      else statuses.push(['DRAFT', 'APPROVED', 'SUBMITTED', 'REJECTED'][s % 4]);
      const status = statuses[0];

      const endDate = at(35 + j * 70 + (s % 10) * 3);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - course.weeks * 7);
      const verifiedAt = new Date(endDate);
      verifiedAt.setDate(verifiedAt.getDate() + 2);
      const submittedAt = new Date(endDate);
      submittedAt.setDate(submittedAt.getDate() + 1);
      const certId = `SEED-${platform.slug.toUpperCase()}-${String(s + 1).padStart(2, '0')}${j + 1}`;
      const proof = await makeProof(student, course, certId);
      const score = [88, 92, 76, 84, 68][(s + j) % 5];
      const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : 'B';
      const semesterKey = semesterOf(endDate);

      const cert = new Certificate({
        student: student._id,
        title: course.title,
        platform: platform._id,
        platformName: course.platform,
        institute: course.platform,
        instructor: '',
        durationWeeks: course.weeks,
        durationHours: course.weeks * 5,
        startDate,
        endDate,
        grade,
        score,
        certificateId: certId,
        certificateUrl: `https://${platform.domains[0]}/verify/${certId.toLowerCase()}`,
        skillTags: course.skills,
        semester: semesterKey,
        semesterKey,
        departmentSnapshot: student.department,
        batchSnapshot: student.batch,
        proof,
        status,
        trustScore: status === 'APPROVED' ? 100 : 72,
        trustReasons: status === 'APPROVED' ? [] : ['Manually seeded for demonstration'],
        submittedAt: status === 'DRAFT' ? undefined : submittedAt,
        verifiedBy:
          status === 'DRAFT' || status === 'SUBMITTED' || status === 'UNDER_REVIEW'
            ? undefined
            : assignedFaculty._id,
        verifiedAt: ['APPROVED', 'REJECTED', 'NEEDS_CHANGES'].includes(status)
          ? verifiedAt
          : undefined,
        remarks:
          status === 'REJECTED'
            ? 'The uploaded document does not clearly show the learner name. Please re-upload a readable copy.'
            : status === 'NEEDS_CHANGES'
              ? 'Please add the certificate ID and correct the course duration.'
              : '',
      });

      if (status === 'APPROVED') {
        certCounter += 1;
        const creditsResult = await creditService.computeCredits(cert, { at: verifiedAt });
        cert.verificationId = `CT-${new Date(verifiedAt).getFullYear()}-${String(certCounter).padStart(5, '0')}`;
        cert.creditsAwarded = creditsResult.credits;
        cert.creditRuleVersion = creditsResult.rule ? creditsResult.rule.version : null;
        cert.creditBreakdown = creditsResult.breakdown;
        const payload = certificateService.buildSignedPayload(cert, student);
        const signed = cryptoService.sign(payload);
        cert.signedPayload = payload;
        cert.signature = signed.signature;
        cert.signatureKeyId = signed.kid;
        cert.qrCodeDataUrl = await qrService.makeVerificationQr(cert.verificationId);
      }

      await cert.save();
      counts[status] += 1;

      const history = [
        { from: 'DRAFT', to: 'SUBMITTED', by: student._id, at: submittedAt, remarks: '' },
      ];
      if (status === 'APPROVED') {
        history.push({
          from: 'SUBMITTED',
          to: 'APPROVED',
          by: assignedFaculty._id,
          at: verifiedAt,
          remarks: 'Verified against the source document.',
        });
        approvedSeen += 1;
      } else if (status === 'REJECTED' || status === 'NEEDS_CHANGES') {
        history.push({
          from: 'SUBMITTED',
          to: status,
          by: assignedFaculty._id,
          at: verifiedAt,
          remarks: cert.remarks,
        });
      } else if (status === 'UNDER_REVIEW') {
        history.push({
          from: 'SUBMITTED',
          to: 'UNDER_REVIEW',
          by: assignedFaculty._id,
          at: submittedAt,
          remarks: 'Review started.',
        });
      }
      if (status !== 'DRAFT') {
        await StatusHistory.create(
          history.map((h) => ({
            certificate: cert._id,
            from: h.from,
            to: h.to,
            by: h.by,
            actorRole: String(h.by) === String(student._id) ? 'student' : 'faculty',
            remarks: h.remarks,
            at: h.at,
          }))
        );
      }

      if (status === 'APPROVED') {
        await creditService.awardCredits(cert, assignedFaculty._id);
        if (approvedSeen <= 12) {
          await Notification.create({
            recipient: student._id,
            type: 'certificate_approved',
            title: 'Certificate approved',
            body: `"${cert.title}" was approved with ${cert.creditsAwarded} credit(s).`,
            link: `/certificates/${cert._id}`,
            data: { certificateId: String(cert._id), credits: cert.creditsAwarded },
            dedupeKey: `seed-approved:${cert._id}`,
          });
        }
      }
      if (status === 'SUBMITTED' && submittedForComments.length < 5)
        submittedForComments.push({ cert, faculty: assignedFaculty, student });
    }
  }

  for (const row of submittedForComments) {
    await Comment.create({
      certificate: row.cert._id,
      author: row.faculty._id,
      authorRole: 'faculty',
      text: 'Please confirm whether the certificate has a public verification link. It helps us complete the review faster.',
    });
  }

  const totalCredits = await CreditLedger.aggregate([
    { $group: { _id: null, total: { $sum: '$credits' } } },
  ]);
  console.log('[seed] complete');
  console.log(`[seed] students: ${students.length}, faculty: ${faculty.length}, certificates: 100`);
  console.log('[seed] status counts:', counts);
  console.log(`[seed] ledger credits: ${(totalCredits[0] && totalCredits[0].total) || 0}`);
  console.log('[seed] accounts:');
  console.log('  admin@certtrack.local / Admin@12345');
  console.log('  hod.cse@certtrack.local / Hod@12345');
  console.log('  faculty1@certtrack.local / Faculty@12345');
  console.log('  student1@certtrack.local / Student@12345');
  console.log(`[seed] admin id: ${admin._id}`);
  await disconnectDB();
}

const reset = process.argv.includes('--reset');
seed({ reset })
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[seed] failed', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });

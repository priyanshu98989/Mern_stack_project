const FacultyAssignment = require('../models/FacultyAssignment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function assignedStudentIds(facultyId) {
  const rows = await FacultyAssignment.find({ faculty: facultyId }).select('student').lean();
  return rows.map((r) => String(r.student));
}

async function departmentOfUser(userId) {
  const u = await User.findById(userId).select('department');
  return u ? u.department : null;
}

async function getScopedStudentIds(user) {
  if (user.role === 'admin') return null;
  if (user.role === 'student') return [String(user.id)];
  if (user.role === 'faculty') return assignedStudentIds(user.id);
  if (user.role === 'hod') {
    const students = await User.find({ role: 'student', department: user.department })
      .select('_id')
      .lean();
    return students.map((s) => String(s._id));
  }
  return [];
}

async function canAccessStudent(user, studentId) {
  if (user.role === 'admin') return true;
  if (user.role === 'student') return String(user.id) === String(studentId);
  if (user.role === 'faculty')
    return (await assignedStudentIds(user.id)).includes(String(studentId));
  if (user.role === 'hod') {
    const dept = await departmentOfUser(studentId);
    return Boolean(dept) && dept === user.department;
  }
  return false;
}

async function canAccessCertificate(user, cert) {
  const studentId = String(cert.student?._id || cert.student);
  if (user.role === 'student') return String(user.id) === studentId;
  if (user.role === 'faculty') return (await assignedStudentIds(user.id)).includes(studentId);
  if (user.role === 'hod') {
    const dept =
      cert.departmentSnapshot ||
      (cert.student && cert.student.department) ||
      (await departmentOfUser(studentId));
    return Boolean(dept) && dept === user.department;
  }
  return user.role === 'admin';
}

async function canVerifyCertificate(user, cert) {
  if (user.role === 'admin') return true;
  const studentId = String(cert.student?._id || cert.student);
  if (user.role === 'faculty') return (await assignedStudentIds(user.id)).includes(studentId);
  if (user.role === 'hod') {
    const dept =
      cert.departmentSnapshot ||
      (cert.student && cert.student.department) ||
      (await departmentOfUser(studentId));
    return Boolean(dept) && dept === user.department;
  }
  return false;
}

async function assertCertificateAccess(user, cert) {
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  if (!(await canAccessCertificate(user, cert)))
    throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this certificate');
  return cert;
}

async function assertVerifier(user, cert) {
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  if (!(await canVerifyCertificate(user, cert)))
    throw new ApiError(403, 'FORBIDDEN', 'Only the assigned verifier can act on this certificate');
  return cert;
}

async function assertStudentAccess(user, studentId, { write = false } = {}) {
  if (user.role === 'student' && String(user.id) !== String(studentId)) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only access your own data');
  }
  if (user.role === 'faculty' && write) {
    throw new ApiError(403, 'FORBIDDEN', 'Faculty cannot modify student records');
  }
  if (!(await canAccessStudent(user, studentId))) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this student');
  }
}

module.exports = {
  assignedStudentIds,
  getScopedStudentIds,
  canAccessStudent,
  canAccessCertificate,
  canVerifyCertificate,
  assertCertificateAccess,
  assertVerifier,
  assertStudentAccess,
};

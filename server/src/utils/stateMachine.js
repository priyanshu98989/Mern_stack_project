const TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
  NEEDS_CHANGES: ['DRAFT', 'SUBMITTED'],
  REJECTED: ['SUBMITTED'],
  APPROVED: ['REJECTED'],
};

const STUDENT_FROM = new Set(['DRAFT', 'NEEDS_CHANGES', 'REJECTED']);
const FACULTY_FROM = new Set(['SUBMITTED', 'UNDER_REVIEW']);
const HOD_FROM = new Set(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED']);
const STUDENT_TO = new Set(['SUBMITTED']);

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function requiresRemarks(to) {
  return to === 'REJECTED' || to === 'NEEDS_CHANGES';
}

function canActorTransition(role, from, to) {
  if (!canTransition(from, to)) return false;
  if (role === 'student') return STUDENT_FROM.has(from) && STUDENT_TO.has(to);
  if (role === 'faculty') return FACULTY_FROM.has(from) && from !== 'APPROVED';
  if (role === 'hod') return HOD_FROM.has(from);
  if (role === 'admin') return true;
  return false;
}

function isOverride(role, from, to) {
  return (role === 'hod' || role === 'admin') && from === 'APPROVED' && to === 'REJECTED';
}

module.exports = { TRANSITIONS, canTransition, requiresRemarks, canActorTransition, isOverride };

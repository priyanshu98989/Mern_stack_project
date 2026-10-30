const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canTransition,
  requiresRemarks,
  canActorTransition,
  isOverride,
} = require('../src/utils/stateMachine');

test('only valid edges are allowed', () => {
  assert.equal(canTransition('DRAFT', 'SUBMITTED'), true);
  assert.equal(canTransition('SUBMITTED', 'APPROVED'), true);
  assert.equal(canTransition('APPROVED', 'UNDER_REVIEW'), false);
  assert.equal(canTransition('UNKNOWN', 'APPROVED'), false);
});

test('students can only submit and cannot approve', () => {
  assert.equal(canActorTransition('student', 'DRAFT', 'SUBMITTED'), true);
  assert.equal(canActorTransition('student', 'SUBMITTED', 'APPROVED'), false);
  assert.equal(canActorTransition('student', 'APPROVED', 'REJECTED'), false);
});

test('faculty cannot act on approved certificates', () => {
  assert.equal(canActorTransition('faculty', 'SUBMITTED', 'APPROVED'), true);
  assert.equal(canActorTransition('faculty', 'APPROVED', 'REJECTED'), false);
});

test('only HOD and admin can revoke approvals', () => {
  assert.equal(isOverride('faculty', 'APPROVED', 'REJECTED'), false);
  assert.equal(isOverride('hod', 'APPROVED', 'REJECTED'), true);
  assert.equal(isOverride('admin', 'APPROVED', 'REJECTED'), true);
});

test('rejection and needs-changes require remarks', () => {
  assert.equal(requiresRemarks('REJECTED'), true);
  assert.equal(requiresRemarks('NEEDS_CHANGES'), true);
  assert.equal(requiresRemarks('APPROVED'), false);
});

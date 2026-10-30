const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parsePagination,
  parseSort,
  paginationMeta,
  escapeRegex,
} = require('../src/utils/pagination');

test('pagination clamps to safe bounds', () => {
  assert.deepEqual(parsePagination({ page: '-3', limit: '9999' }), {
    page: 1,
    limit: 100,
    skip: 0,
  });
  assert.deepEqual(parsePagination({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
});

test('sort falls back when field is not allowed', () => {
  assert.deepEqual(parseSort({ sort: 'password:asc' }, ['createdAt'], '-createdAt'), {
    createdAt: -1,
  });
  assert.deepEqual(parseSort({ sort: 'title:asc' }, ['title'], '-createdAt'), { title: 1 });
});

test('meta and regex escaping', () => {
  assert.deepEqual(paginationMeta(0, 1, 20), { total: 0, page: 1, limit: 20, totalPages: 1 });
  assert.equal(escapeRegex('a.b*c'), 'a\\.b\\*c');
});

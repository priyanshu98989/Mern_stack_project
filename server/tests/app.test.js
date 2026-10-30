process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('health endpoint reports database state and request id', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 503);
  assert.ok(res.headers.get('x-request-id'));
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.data.db, 'disconnected');
});

test('unknown routes return a JSON 404 envelope', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/api/v1/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'NOT_FOUND');
});

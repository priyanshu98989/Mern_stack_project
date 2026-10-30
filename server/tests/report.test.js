const test = require('node:test');
const assert = require('node:assert/strict');
const { toXlsxBuffer } = require('../src/services/reportService');

test('builds a valid xlsx zip buffer for report sheets', async () => {
  const buffer = await toXlsxBuffer({
    Certificates: [
      { title: 'Cloud Fundamentals', credits: 2 },
      { title: 'Data Essentials', credits: 3 },
    ],
    Empty: [],
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 0);
  assert.equal(buffer.subarray(0, 2).toString('utf8'), 'PK');
});

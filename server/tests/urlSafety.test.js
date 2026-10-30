const test = require('node:test');
const assert = require('node:assert/strict');
const { assertPublicHttpUrl, isPrivateHostname } = require('../src/utils/urlSafety');

test('rejects private and reserved hosts', () => {
  for (const host of [
    'localhost',
    '127.0.0.1',
    '10.1.2.3',
    '192.168.0.5',
    '169.254.169.254',
    '[::1]',
    'foo.local',
  ]) {
    assert.equal(isPrivateHostname(host.replace(/^\[|\]$/g, '')), true, host);
  }
  assert.equal(isPrivateHostname('example.com'), false);
});

test('accepts public https urls', () => {
  const url = assertPublicHttpUrl('https://example.com/certificate/123');
  assert.equal(url.hostname, 'example.com');
});

test('rejects dangerous protocols, credentials and private targets', () => {
  assert.throws(() => assertPublicHttpUrl('file:///etc/passwd'), /http or https|valid/i);
  assert.throws(() => assertPublicHttpUrl('https://user:pass@example.com'), /credentials/i);
  assert.throws(
    () => assertPublicHttpUrl('http://169.254.169.254/latest/meta-data'),
    /public host/i
  );
});

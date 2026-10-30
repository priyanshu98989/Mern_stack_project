const net = require('net');
const ApiError = require('./ApiError');

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
]);
const BLOCKED_TLDS = ['.local', '.internal', '.localhost', '.home', '.lan'];

function isPrivateIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255))
    return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(address) {
  const value = address.toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return true;
  if (value.startsWith('::ffff:')) return isPrivateIPv4(value.slice(7));
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return Boolean(mapped) && isPrivateIPv4(mapped[1]);
}

function isPrivateHostname(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/\.$/, '');
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (BLOCKED_TLDS.some((tld) => host.endsWith(tld))) return true;
  const ipVersion = net.isIP(host);
  if (ipVersion === 4) return isPrivateIPv4(host);
  if (ipVersion === 6) return isPrivateIPv6(host.replace(/^\[|\]$/g, ''));
  return false;
}

function assertPublicHttpUrl(value, { field = 'URL' } = {}) {
  let url;
  try {
    url = new URL(String(value));
  } catch (err) {
    throw new ApiError(400, 'INVALID_URL', `${field} must be a valid absolute URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ApiError(400, 'INVALID_URL_PROTOCOL', `${field} must use http or https`);
  }
  if (url.username || url.password) {
    throw new ApiError(400, 'INVALID_URL', `${field} must not contain credentials`);
  }
  if (isPrivateHostname(url.hostname)) {
    throw new ApiError(400, 'URL_NOT_ALLOWED', `${field} must point to a public host`);
  }
  return url;
}

module.exports = { assertPublicHttpUrl, isPrivateHostname, isPrivateIPv4, isPrivateIPv6 };

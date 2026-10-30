const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const logger = require('../config/logger');

const KEY_FILE = path.join(env.SIGNING_KEYS_DIR, 'keys.json');
const keys = new Map();
let activeKid = env.SIGNING_KEY_ID;

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keysSorted = Object.keys(value).sort();
  return `{${keysSorted.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function pemToKey(pem, type) {
  return type === 'private'
    ? crypto.createPrivateKey({ key: pem, format: 'pem', type: 'pkcs8' })
    : crypto.createPublicKey({ key: pem, format: 'pem', type: 'spki' });
}

function addKey(kid, privateKey) {
  const publicKey = crypto.createPublicKey(privateKey);
  keys.set(kid, { kid, privateKey, publicKey, createdAt: new Date().toISOString() });
}

function persist() {
  try {
    fs.mkdirSync(env.SIGNING_KEYS_DIR, { recursive: true, mode: 0o700 });
    const payload = {
      activeKid,
      keys: [...keys.values()].map((k) => ({
        kid: k.kid,
        privateKey: k.privateKey.export({ format: 'pem', type: 'pkcs8' }),
        publicKey: k.publicKey.export({ format: 'pem', type: 'spki' }),
        createdAt: k.createdAt,
      })),
    };
    fs.writeFileSync(KEY_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
  } catch (err) {
    logger.warn({ err }, '[crypto] could not persist signing keys');
  }
}

function generateKey(kid) {
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  addKey(kid, privateKey);
  return kid;
}

function loadKeys() {
  if (env.SIGNING_PRIVATE_KEY) {
    try {
      let privateKey;
      if (env.SIGNING_PRIVATE_KEY.includes('BEGIN')) {
        privateKey = pemToKey(env.SIGNING_PRIVATE_KEY.replace(/\\n/g, '\n'), 'private');
      } else {
        privateKey = crypto.createPrivateKey({
          key: Buffer.from(env.SIGNING_PRIVATE_KEY, 'base64'),
          format: 'der',
          type: 'pkcs8',
        });
      }
      addKey(activeKid, privateKey);
      return;
    } catch (err) {
      logger.warn({ err }, '[crypto] SIGNING_PRIVATE_KEY invalid; falling back to local key file');
    }
  }

  if (fs.existsSync(KEY_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
      for (const row of parsed.keys || []) {
        addKey(row.kid, pemToKey(row.privateKey, 'private'));
      }
      activeKid = parsed.activeKid || activeKid;
      if (keys.size) return;
    } catch (err) {
      logger.warn({ err }, '[crypto] key file unreadable; generating a new key');
    }
  }

  generateKey(activeKid);
  persist();
  logger.warn({ kid: activeKid }, '[crypto] generated local Ed25519 key. Do not commit .keys/.');
}

loadKeys();

function sign(payload) {
  const data = Buffer.from(stableStringify(payload));
  const entry = keys.get(activeKid) || [...keys.values()][0];
  if (!entry) throw new Error('No signing key available');
  const signature = crypto.sign(null, data, entry.privateKey).toString('base64');
  return { signature, kid: entry.kid, alg: 'EdDSA', payload: stableStringify(payload) };
}

function verify(payload, signatureB64, kid) {
  try {
    const entry = keys.get(kid) || keys.get(activeKid);
    if (!entry || !signatureB64) return false;
    const data = Buffer.from(typeof payload === 'string' ? payload : stableStringify(payload));
    return crypto.verify(null, data, entry.publicKey, Buffer.from(signatureB64, 'base64'));
  } catch (err) {
    return false;
  }
}

function publicJwk(kid) {
  const entry = keys.get(kid);
  if (!entry) return null;
  const jwk = entry.publicKey.export({ format: 'jwk' });
  return { kty: 'OKP', crv: 'Ed25519', x: jwk.x, kid: entry.kid, use: 'sig', alg: 'EdDSA' };
}

function jwks() {
  return { keys: [...keys.keys()].map(publicJwk).filter(Boolean) };
}

function rotateKey(newKid) {
  const kid = newKid || `ct-key-${Date.now()}`;
  if (keys.has(kid)) throw new Error('Key ID already exists');
  generateKey(kid);
  activeKid = kid;
  persist();
  return { kid, jwks: jwks() };
}

function getKid() {
  return activeKid;
}

function getPublicKey(kid) {
  const entry = keys.get(kid) || keys.get(activeKid);
  return entry ? entry.publicKey : null;
}

module.exports = {
  stableStringify,
  sign,
  verify,
  jwks,
  publicJwk,
  rotateKey,
  getKid,
  getPublicKey,
  loadKeys,
  keyIds: () => [...keys.keys()],
};

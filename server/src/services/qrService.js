const QRCode = require('qrcode');
const env = require('../config/env');

async function makeVerificationQr(verificationId) {
  let base = env.CLIENT_URL;
  if (!base || /localhost/.test(base)) base = 'https://mern-stack-project-blush.vercel.app';
  const url = `${base}/verify/${encodeURIComponent(verificationId)}`;
  return QRCode.toDataURL(url, {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#111827', light: '#ffffff' },
  });
}

module.exports = { makeVerificationQr };

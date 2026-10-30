const QRCode = require('qrcode');
const env = require('../config/env');

async function makeVerificationQr(verificationId) {
  const url = `${env.CLIENT_URL}/verify/${encodeURIComponent(verificationId)}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#111827', light: '#ffffff' },
  });
}

module.exports = { makeVerificationQr };

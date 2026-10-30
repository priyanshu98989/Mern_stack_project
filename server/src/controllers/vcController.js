const Certificate = require('../models/Certificate');
const cryptoService = require('../services/cryptoService');
const certificateService = require('../services/certificateService');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { assertCertificateAccess } = require('../middleware/ownership');
const env = require('../config/env');

exports.exportVC = asyncHandler(async (req, res) => {
  const cert = await Certificate.findById(req.params.id)
    .populate('student', 'name email')
    .populate('platform', 'name');
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  if (cert.status !== 'APPROVED')
    throw new ApiError(400, 'NOT_APPROVED', 'Only approved certificates can be exported');
  await certificateService.addSignatureIfMissing(cert);

  const credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/openbadges/v3'],
    id: `urn:uuid:${cert.verificationId}`,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: { id: env.ISSUER_URL, type: 'Profile', name: env.INSTITUTION_NAME },
    issuanceDate: cert.verifiedAt
      ? new Date(cert.verifiedAt).toISOString()
      : new Date().toISOString(),
    credentialSubject: {
      id: `urn:certtrack:student:${cert.student?._id}`,
      type: 'AchievementSubject',
      name: cert.student?.name,
      achievement: {
        id: `urn:certtrack:course:${cert._id}`,
        type: 'Achievement',
        name: cert.title,
        description: `Completed ${cert.title} on ${cert.platform?.name || cert.platformName || 'an external platform'}`,
        criteria: { narrative: 'Approved by a CertTrack faculty verifier' },
        alignment: (cert.skillTags || []).map((skill) => ({
          targetName: skill,
          targetType: 'Skill',
        })),
      },
    },
    cred: {
      verificationId: cert.verificationId,
      creditsAwarded: cert.creditsAwarded,
      platform: cert.platform?.name || cert.platformName,
      department: cert.departmentSnapshot,
      semester: cert.semesterKey || cert.semester,
    },
  };

  const proof = cryptoService.sign(credential);
  const verifiableCredential = {
    ...credential,
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${env.ISSUER_URL}${env.API_PREFIX}/verify/.well-known/jwks.json#${proof.kid}`,
      proofPurpose: 'assertionMethod',
      jws: proof.signature,
    },
  };

  ok(res, { verifiableCredential });
});

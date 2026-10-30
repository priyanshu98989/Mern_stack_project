const env = require('../config/env');

const errorResponse = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          data: { nullable: true, example: null },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { nullable: true },
            },
          },
          meta: { type: 'object', properties: { requestId: { type: 'string' } } },
        },
      },
    },
  },
};

const certSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    platformName: { type: 'string' },
    status: {
      type: 'string',
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
    },
    semester: { type: 'string' },
    creditsAwarded: { type: 'number' },
    trustScore: { type: 'number' },
    verificationId: { type: 'string', nullable: true },
    submittedAt: { type: 'string', format: 'date-time', nullable: true },
    verifiedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'CertTrack API',
    version: env.APP_VERSION,
    description: 'Certification and credit tracking API for students, faculty, HODs and admins.',
  },
  servers: [{ url: env.SERVER_URL, description: 'Local server' }],
  tags: [
    { name: 'Auth' },
    { name: 'Certificates' },
    { name: 'Credits' },
    { name: 'Analytics' },
    { name: 'Notifications' },
    { name: 'Reports' },
    { name: 'Verification' },
    { name: 'Admin' },
    { name: 'AI' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: errorResponse.content['application/json'].schema,
      Certificate: certSchema,
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['student', 'faculty', 'hod', 'admin'] },
          department: { type: 'string' },
          batch: { type: 'string' },
          emailVerified: { type: 'boolean' },
          twoFactorEnabled: { type: 'boolean' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Validation: {
        description: 'Validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health and readiness probe',
        responses: {
          200: { description: 'Service healthy' },
          503: { description: 'Database unavailable' },
        },
      },
    },
    '/api/v1/auth/csrf': {
      get: {
        tags: ['Auth'],
        summary: 'Issue a CSRF token cookie',
        responses: { 200: { description: 'CSRF token issued' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a student account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  department: { type: 'string' },
                  batch: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registered' },
          400: { $ref: '#/components/responses/Validation' },
          409: { $ref: '#/components/responses/Validation' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password; optional 2FA code',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  twoFactorToken: {
                    type: 'string',
                    description: '6-digit TOTP code when 2FA is enabled',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Access token + user; refresh and CSRF cookies set' },
          401: { description: 'Invalid credentials or 2FA required' },
          423: { description: 'Account locked' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token',
        description:
          'Requires the refreshToken cookie and x-csrf-token header matching the csrfToken cookie.',
        parameters: [
          { in: 'header', name: 'x-csrf-token', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'New access token' },
          401: { description: 'Invalid or reused refresh token' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke current refresh token and clear cookies',
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Current user profile and credits',
        responses: {
          200: { description: 'Profile' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        summary: 'Update own profile and notification preferences',
        responses: { 200: { description: 'Updated profile' } },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        responses: { 200: { description: 'Generic response' } },
      },
    },
    '/api/v1/auth/reset-password/{token}': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using emailed token',
        parameters: [{ in: 'path', name: 'token', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Password reset' },
          400: { $ref: '#/components/responses/Validation' },
        },
      },
    },
    '/api/v1/auth/verify-email/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Verify email address',
        parameters: [{ in: 'path', name: 'token', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Verified' } },
      },
    },
    '/api/v1/certificates': {
      get: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'List certificates in the caller scope',
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated certificates' } },
      },
      post: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Create a draft certificate (student, verified email)',
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Certificate' } },
            },
          },
        },
      },
    },
    '/api/v1/certificates/{id}': {
      get: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Get certificate',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Certificate' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Edit an editable certificate (owner or admin)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Updated' },
          403: { description: 'Not the owner or not allowed to edit' },
          409: { description: 'Certificate is not editable or version conflict' },
        },
      },
      delete: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Delete a draft or archive an editable certificate',
        description:
          'Drafts are removed permanently. Other editable states are soft-deleted via deletedAt. Approved, submitted and in-review certificates cannot be deleted.',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Deleted or soft-deleted (`data.softDeleted`)' },
          403: { description: 'Not allowed' },
          409: { description: 'Certificate state cannot be deleted' },
        },
      },
    },
    '/api/v1/certificates/{id}/proof': {
      get: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Stream the proof document to an authorized viewer',
        description:
          'Returns the stored document inline. Access is limited to the owner, assigned faculty, the department HOD and admins.',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Proof document',
            content: {
              'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Upload proof (PDF/JPG/PNG, max 5MB)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { proof: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Proof stored; trust score computed' } },
      },
    },
    '/api/v1/certificates/{id}/submit': {
      post: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Submit draft for verification',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Submitted' } },
      },
    },
    '/api/v1/certificates/{id}/transition': {
      post: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Change certificate status (faculty/HOD/admin; student draft reset)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to'],
                properties: {
                  to: {
                    type: 'string',
                    enum: [
                      'SUBMITTED',
                      'UNDER_REVIEW',
                      'APPROVED',
                      'REJECTED',
                      'NEEDS_CHANGES',
                      'DRAFT',
                    ],
                  },
                  remarks: { type: 'string' },
                  version: { type: 'integer', description: 'Optimistic concurrency version' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Transitioned' },
          409: { description: 'Version conflict' },
        },
      },
    },
    '/api/v1/certificates/{id}/ocr': {
      post: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Run OCR on the proof and update trust score',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OCR suggestions' } },
      },
    },
    '/api/v1/certificates/{id}/history': {
      get: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Status history',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'History entries' } },
      },
    },
    '/api/v1/certificates/{id}/breakdown': {
      get: {
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        summary: 'Credit calculation breakdown',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Breakdown' } },
      },
    },
    '/api/v1/certificates/{id}/comments': {
      get: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'List comments',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Comments' } },
      },
      post: {
        tags: ['Certificates'],
        security: [{ bearerAuth: [] }],
        summary: 'Add comment',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Comment created' } },
      },
    },
    '/api/v1/credits/me': {
      get: {
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        summary: 'My credits, progress, and ledger',
        responses: { 200: { description: 'Credits summary' } },
      },
    },
    '/api/v1/credits/ledger/{userId}': {
      get: {
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        summary: 'Scoped credit ledger',
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Ledger' } },
      },
    },
    '/api/v1/credits/rules': {
      get: {
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        summary: 'List credit rules (admin)',
        responses: { 200: { description: 'Rules' } },
      },
      post: {
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        summary: 'Create a new rule version (admin)',
        responses: { 201: { description: 'Rule created' } },
      },
    },
    '/api/v1/analytics/student/{id}': {
      get: {
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        summary: 'Student analytics (use id=me for self)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Analytics' } },
      },
    },
    '/api/v1/analytics/faculty/{id}': {
      get: {
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        summary: 'Faculty verification analytics',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Analytics' } },
      },
    },
    '/api/v1/analytics/department/{id}': {
      get: {
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        summary: 'Department analytics',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Analytics' } },
      },
    },
    '/api/v1/analytics/leaderboard': {
      get: {
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        summary: 'Scoped credit leaderboard',
        responses: { 200: { description: 'Leaderboard' } },
      },
    },
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        summary: 'List notifications and unread count',
        responses: { 200: { description: 'Notifications' } },
      },
    },
    '/api/v1/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        summary: 'Mark one notification read',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/v1/reports/transcript/{studentId}': {
      get: {
        tags: ['Reports'],
        security: [{ bearerAuth: [] }],
        summary: 'Download credit transcript (pdf/xlsx/csv)',
        parameters: [
          { in: 'path', name: 'studentId', required: true, schema: { type: 'string' } },
          {
            in: 'query',
            name: 'format',
            schema: { type: 'string', enum: ['pdf', 'xlsx', 'csv'], default: 'pdf' },
          },
        ],
        responses: { 200: { description: 'File download' } },
      },
    },
    '/api/v1/reports/department': {
      get: {
        tags: ['Reports'],
        security: [{ bearerAuth: [] }],
        summary: 'Download department report',
        parameters: [
          { in: 'query', name: 'department', schema: { type: 'string' } },
          { in: 'query', name: 'format', schema: { type: 'string', enum: ['pdf', 'xlsx', 'csv'] } },
        ],
        responses: { 200: { description: 'File download' } },
      },
    },
    '/api/v1/reports/certificates': {
      get: {
        tags: ['Reports'],
        security: [{ bearerAuth: [] }],
        summary: 'Export scoped certificate report',
        parameters: [
          { in: 'query', name: 'format', schema: { type: 'string', enum: ['pdf', 'xlsx', 'csv'] } },
        ],
        responses: { 200: { description: 'File download' } },
      },
    },
    '/api/v1/verify/{id}': {
      get: {
        tags: ['Verification'],
        summary: 'Public privacy-masked certificate verification',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', example: 'CT-2026-AB12CD34' },
          },
        ],
        responses: {
          200: { description: 'Verification result' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/verify/.well-known/jwks.json': {
      get: {
        tags: ['Verification'],
        summary: 'Public Ed25519 signing keys',
        responses: { 200: { description: 'JWKS' } },
      },
    },
    '/api/v1/admin/users': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'List users (admin)',
        responses: { 200: { description: 'Users' } },
      },
      post: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Create user (admin)',
        responses: { 201: { description: 'User created' } },
      },
    },
    '/api/v1/admin/students': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'List students in faculty/HOD/admin scope',
        responses: { 200: { description: 'Students' } },
      },
    },
    '/api/v1/admin/settings': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Read platform settings',
        responses: { 200: { description: 'Settings' } },
      },
      patch: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Update platform settings',
        responses: { 200: { description: 'Updated settings' } },
      },
    },
    '/api/v1/audit-logs': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'Audit trail (HOD scoped, admin all)',
        responses: { 200: { description: 'Audit entries' } },
      },
    },
    '/api/v1/feature-flags': {
      get: {
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        summary: 'List feature flags',
        responses: { 200: { description: 'Flags' } },
      },
    },
    '/api/v1/ai/analyze/{id}': {
      post: {
        tags: ['AI'],
        security: [{ bearerAuth: [] }],
        summary: 'AI extraction from proof text with heuristic fallback',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Suggestions' },
          429: { description: 'Daily AI limit reached' },
        },
      },
    },
    '/api/v1/ai/verifier-copilot/{id}': {
      get: {
        tags: ['AI'],
        security: [{ bearerAuth: [] }],
        summary: 'Verifier risk summary (faculty/HOD/admin)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Explanation' } },
      },
    },
    '/api/v1/ai/skill-gap': {
      post: {
        tags: ['AI'],
        security: [{ bearerAuth: [] }],
        summary: 'Skill-gap recommendations',
        responses: { 200: { description: 'Recommendations' } },
      },
    },
  },
};

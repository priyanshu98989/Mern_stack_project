const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    department: z.string().trim().max(100).optional(),
    batch: z.string().trim().max(40).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(128),
    twoFactorToken: z.string().trim().min(6).max(8).optional(),
  }),
});

const forgotSchema = z.object({
  body: z.object({ email: z.string().trim().email() }),
});

const resetSchema = z.object({
  body: z.object({ password: z.string().min(8).max(128) }),
  params: z.object({ token: z.string().min(10) }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  }),
});

const resendVerificationSchema = z.object({
  body: z.object({ email: z.string().trim().email() }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().max(20).optional(),
    profilePhoto: z.string().trim().max(500).optional(),
    department: z.string().trim().max(100).optional(),
    batch: z.string().trim().max(40).optional(),
    notificationPrefs: z
      .object({
        email: z.boolean().optional(),
        inapp: z.boolean().optional(),
        decisions: z.boolean().optional(),
        comments: z.boolean().optional(),
        sla: z.boolean().optional(),
      })
      .optional(),
  }),
});

const setupTwoFactorSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1).max(128) }),
});

const enableTwoFactorSchema = z.object({
  body: z.object({
    secret: z.string().min(16).max(128),
    token: z.string().trim().min(6).max(8),
  }),
});

const disableTwoFactorSchema = z.object({
  body: z.object({ token: z.string().trim().min(6).max(8) }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  changePasswordSchema,
  resendVerificationSchema,
  updateProfileSchema,
  setupTwoFactorSchema,
  enableTwoFactorSchema,
  disableTwoFactorSchema,
};

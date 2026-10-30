const { z } = require('zod');

const optionalDate = z.string().trim().optional().or(z.literal(''));
const optionalNumber = z.coerce.number().min(0).optional();

const createSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(220),
    platform: z.string().trim().optional().or(z.literal('')),
    platformName: z.string().trim().max(120).optional(),
    institute: z.string().trim().max(200).optional(),
    instructor: z.string().trim().max(200).optional(),
    durationWeeks: optionalNumber,
    durationHours: optionalNumber,
    startDate: optionalDate,
    endDate: optionalDate,
    grade: z.string().trim().max(40).optional(),
    score: z.coerce.number().min(0).max(100).optional(),
    certificateId: z.string().trim().max(120).optional(),
    certificateUrl: z.string().trim().url().max(1000).optional().or(z.literal('')),
    skillTags: z.array(z.string().trim().max(60)).max(30).optional(),
    semester: z.string().trim().max(40).optional(),
  }),
});

const updateSchema = z.object({
  body: createSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

const transitionSchema = z.object({
  body: z.object({
    to: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'DRAFT']),
    remarks: z.string().max(2000).optional(),
    version: z.number().int().min(0).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

const platformSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().max(120).optional(),
    website: z.string().trim().url().max(500).optional().or(z.literal('')),
    verificationUrlTemplate: z.string().trim().max(500).optional(),
    domains: z.array(z.string().trim().max(200)).max(20).optional(),
    active: z.boolean().optional(),
  }),
});

const updatePlatformSchema = z.object({
  body: platformSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

module.exports = {
  createSchema,
  updateSchema,
  transitionSchema,
  platformSchema,
  updatePlatformSchema,
};

const { z } = require('zod');

const criteriaSchema = z.object({
  minDurationWeeks: z.coerce.number().min(0).optional(),
  minDurationHours: z.coerce.number().min(0).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  grades: z.array(z.string().trim().max(40)).max(20).optional(),
});

const createRuleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(160),
    ruleKey: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    platform: z.string().trim().optional().nullable().or(z.literal('')),
    criteria: criteriaSchema.optional(),
    credits: z.coerce.number().min(0).max(50),
    perSemesterCap: z.coerce.number().min(0).nullable().optional(),
    perPlatformCap: z.coerce.number().min(0).nullable().optional(),
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateRuleSchema = z.object({
  body: createRuleSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

const simulateSchema = z.object({
  body: z.object({
    platform: z.string().optional().nullable(),
    platformName: z.string().trim().max(120).optional(),
    durationWeeks: z.coerce.number().min(0).max(520).optional(),
    durationHours: z.coerce.number().min(0).max(5000).optional(),
    score: z.coerce.number().min(0).max(100).optional(),
    grade: z.string().trim().max(40).optional(),
    semester: z.string().trim().max(40).optional(),
  }),
});

const adjustSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    certificateId: z.string().min(1),
    credits: z.coerce.number().min(-50).max(50),
    note: z.string().trim().min(3).max(500),
  }),
});

module.exports = { createRuleSchema, updateRuleSchema, simulateSchema, adjustSchema };

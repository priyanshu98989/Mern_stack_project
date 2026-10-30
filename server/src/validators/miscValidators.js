const { z } = require('zod');

const featureFlagSchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    description: z.string().trim().max(500).optional(),
  }),
  params: z.object({ key: z.string().trim().min(2).max(80) }),
});

const commentSchema = z.object({
  body: z.object({ text: z.string().trim().min(1).max(2000) }),
  params: z.object({ id: z.string().min(1) }),
});

const prefsSchema = z.object({
  body: z.object({
    email: z.boolean().optional(),
    inapp: z.boolean().optional(),
    decisions: z.boolean().optional(),
    comments: z.boolean().optional(),
    sla: z.boolean().optional(),
  }),
});

module.exports = { featureFlagSchema, commentSchema, prefsSchema };

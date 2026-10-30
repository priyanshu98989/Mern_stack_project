const { z } = require('zod');

const semanticSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(220),
    candidates: z
      .array(
        z.object({
          id: z.string().optional(),
          title: z.string().trim().min(1).max(220),
        })
      )
      .max(200)
      .optional(),
  }),
});

const skillGapSchema = z.object({
  body: z.object({
    path: z.string().trim().max(60).optional(),
    studentId: z.string().optional(),
  }),
});

const applySchema = z.object({
  body: z.object({
    fields: z
      .array(
        z.enum([
          'title',
          'certificateId',
          'platformName',
          'institute',
          'startDate',
          'endDate',
          'grade',
          'score',
          'durationWeeks',
          'durationHours',
          'skillTags',
        ])
      )
      .min(1),
  }),
  params: z.object({ id: z.string().min(1) }),
});

module.exports = { semanticSchema, skillGapSchema, applySchema };

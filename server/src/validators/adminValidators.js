const { z } = require('zod');

const roleEnum = z.enum(['student', 'faculty', 'hod', 'admin']);

const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(8).max(128).optional(),
    role: roleEnum.optional(),
    department: z.string().trim().max(100).optional(),
    batch: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(20).optional(),
    emailVerified: z.boolean().optional(),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
    role: roleEnum.optional(),
    department: z.string().trim().max(100).optional(),
    batch: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(20).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    emailVerified: z.boolean().optional(),
    departmentId: z.string().optional(),
    batchId: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

const departmentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    code: z.string().trim().max(20).optional(),
    active: z.boolean().optional(),
  }),
});

const updateDepartmentSchema = z.object({
  body: departmentSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

const batchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80),
    department: z.string().optional(),
    year: z.coerce.number().int().min(1900).max(2200).optional(),
    active: z.boolean().optional(),
  }),
});

const assignmentSchema = z.object({
  body: z.object({
    faculty: z.string().min(1),
    student: z.string().min(1),
    note: z.string().trim().max(500).optional(),
  }),
});

const bulkAssignmentSchema = z.object({
  body: z.object({
    rows: z
      .array(
        z.object({
          facultyEmail: z.string().email(),
          studentEmail: z.string().email(),
        })
      )
      .min(1)
      .max(1000),
  }),
});

const settingsSchema = z.object({
  body: z.record(z.any()),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  departmentSchema,
  updateDepartmentSchema,
  batchSchema,
  assignmentSchema,
  bulkAssignmentSchema,
  settingsSchema,
};

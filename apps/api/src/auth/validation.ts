import { z } from "zod";

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{4,20}$/);
export const passwordSchema = z.string().min(12).max(128);

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  realName: z.string().trim().min(1).max(50),
  schoolName: z.string().trim().min(1).max(100),
  grade: z.coerce.number().int().min(1).max(6),
  classNumber: z.coerce.number().int().min(1).max(99),
  studentNumber: z.coerce.number().int().min(1).max(99),
  adminToken: z.string().trim().max(256).optional()
});

export const loginSchema = z.object({ username: usernameSchema, password: z.string().min(1).max(128) });

import { defaultLearningSettings, normalizeAnswerLevel, type LearningSettings } from "@studybox/shared";
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

const answerLevelSchema = z
  .enum(["middle1", "middle2", "middle3", "high1", "high2", "high3", "basic", "standard", "advanced"])
  .transform((value) => normalizeAnswerLevel(value) || defaultLearningSettings.level) as unknown as z.ZodType<LearningSettings["level"]>;

export const learningSettingsSchema = z.object({
  mode: z.enum(["concept", "solve", "summary", "exam", "performance"]),
  level: answerLevelSchema,
  responseLength: z.enum(["short", "standard", "detailed"])
});

export const conversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  settings: learningSettingsSchema.optional()
});

export const titleSchema = z.object({ title: z.string().trim().min(1).max(120) });
export const messageSchema = z.object({ question: z.string().trim().min(1).max(2000), settings: learningSettingsSchema });
export const uuidSchema = z.string().uuid();

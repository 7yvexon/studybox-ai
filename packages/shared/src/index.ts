export const learningModes = [
  "concept",
  "solve",
  "summary",
  "exam",
  "performance"
] as const;

export const answerLevels = ["middle1", "middle2", "middle3", "high1", "high2", "high3"] as const;
export const learningLevels = answerLevels;
export const responseLengths = ["short", "standard", "detailed"] as const;

export type LearningMode = (typeof learningModes)[number];
export type AnswerLevel = (typeof answerLevels)[number];
export type LearningLevel = AnswerLevel;
export type ResponseLength = (typeof responseLengths)[number];
export type MessageRole = "user" | "assistant";

export interface LearningSettings {
  mode: LearningMode;
  level: LearningLevel;
  responseLength: ResponseLength;
}

export interface ResponseSection {
  title: string;
  content: string;
}

export interface GeneratedReply {
  title: string;
  summary: string;
  sections: ResponseSection[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  settings: LearningSettings | null;
  response: GeneratedReply | null;
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  settings: LearningSettings;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
}

export interface CurrentUser {
  id: string;
  username: string;
  realName: string;
  schoolName: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  role: "user" | "admin";
  createdAt: string;
}

export interface ChatProvider {
  name: string;
  model: string;
  generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult>;
}

export interface GenerateReplyInput {
  question: string;
  settings: LearningSettings;
  conversation: Array<Pick<Message, "role" | "content" | "response">>;
}

export interface GenerateReplyResult {
  reply: GeneratedReply;
  rawContent: string;
}

export const defaultLearningSettings: LearningSettings = {
  mode: "concept",
  level: "middle2",
  responseLength: "standard"
};

const legacyAnswerLevels: Record<string, AnswerLevel> = {
  basic: "middle1",
  standard: "middle2",
  advanced: "high2"
};

export const normalizeAnswerLevel = (value: unknown): AnswerLevel | null => {
  if (typeof value !== "string") {
    return null;
  }

  if (answerLevels.includes(value as AnswerLevel)) {
    return value as AnswerLevel;
  }

  return legacyAnswerLevels[value] || null;
};

export const normalizeLearningSettings = (value: unknown): LearningSettings | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const settings = value as Partial<LearningSettings> & { level?: unknown };
  const level = normalizeAnswerLevel(settings.level);

  if (
    !settings.mode ||
    !learningModes.includes(settings.mode) ||
    !level ||
    !settings.responseLength ||
    !responseLengths.includes(settings.responseLength)
  ) {
    return null;
  }

  return {
    mode: settings.mode,
    level,
    responseLength: settings.responseLength
  };
};

export const isLearningSettings = (value: unknown): value is LearningSettings => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settings = value as Partial<LearningSettings>;

  return Boolean(
    settings.mode &&
      learningModes.includes(settings.mode) &&
      settings.level &&
      learningLevels.includes(settings.level) &&
      settings.responseLength &&
      responseLengths.includes(settings.responseLength)
  );
};

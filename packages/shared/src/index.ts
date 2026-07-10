export const learningModes = [
  "concept",
  "solve",
  "summary",
  "exam",
  "performance"
] as const;

export const learningLevels = ["basic", "standard", "advanced"] as const;
export const responseLengths = ["short", "standard", "detailed"] as const;

export type LearningMode = (typeof learningModes)[number];
export type LearningLevel = (typeof learningLevels)[number];
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
  email: string;
  emailVerified: boolean;
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
  level: "standard",
  responseLength: "standard"
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

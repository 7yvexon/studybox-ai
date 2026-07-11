import type {
  Conversation,
  CurrentUser,
  GeneratedReply,
  LearningSettings,
  Message
} from "@studybox/shared";

import { ApiError } from "../lib/http.js";
import { createId } from "../lib/security.js";

interface MemoryUserRow {
  id: string;
  username: string;
  password_hash: string;
  real_name: string;
  school_name: string;
  grade: number;
  class_number: number;
  student_number: number;
  role: "user" | "admin";
  created_at: Date;
}

interface StoredConversation extends Conversation {
  userId: string;
}

const usersById = new Map<string, MemoryUserRow>();
const userIdsByUsername = new Map<string, string>();
const sessions = new Map<string, { userId: string; expiresAt: Date }>();
const conversations = new Map<string, StoredConversation>();
const messages = new Map<string, Message[]>();
const dailyUsage = new Map<string, number>();

const mapUser = (row: MemoryUserRow): CurrentUser => ({
  id: row.id,
  username: row.username,
  realName: row.real_name,
  schoolName: row.school_name,
  grade: row.grade,
  classNumber: row.class_number,
  studentNumber: row.student_number,
  role: row.role,
  createdAt: row.created_at.toISOString()
});

const mapConversation = (stored: StoredConversation): Conversation => ({
  id: stored.id,
  title: stored.title,
  settings: stored.settings,
  createdAt: stored.createdAt,
  updatedAt: stored.updatedAt,
  lastMessagePreview: stored.lastMessagePreview
});

const ownedConversation = (userId: string, conversationId: string) => {
  const conversation = conversations.get(conversationId);

  if (!conversation || conversation.userId !== userId) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "대화를 찾을 수 없습니다.");
  }

  return conversation;
};

export const findUserByUsername = async (username: string) => {
  const id = userIdsByUsername.get(username);
  return id ? usersById.get(id) ?? null : null;
};

export const getCurrentUserBySession = async (tokenHash: string) => {
  const session = sessions.get(tokenHash);

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    sessions.delete(tokenHash);
    return null;
  }

  const user = usersById.get(session.userId);
  return user ? mapUser(user) : null;
};

export const registerUser = async ({
  username,
  passwordHash,
  realName,
  schoolName,
  grade,
  classNumber,
  studentNumber,
  role
}: {
  username: string;
  passwordHash: string;
  realName: string;
  schoolName: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  role: "user" | "admin";
}) => {
  if (userIdsByUsername.has(username)) {
    throw new ApiError(409, "USERNAME_IN_USE", "이미 사용 중인 아이디입니다.");
  }

  const id = createId();
  const row: MemoryUserRow = {
    id,
    username,
    password_hash: passwordHash,
    real_name: realName,
    school_name: schoolName,
    grade,
    class_number: classNumber,
    student_number: studentNumber,
    role,
    created_at: new Date()
  };

  usersById.set(id, row);
  userIdsByUsername.set(username, id);
  return mapUser(row);
};

export const deleteUser = async (userId: string) => {
  const user = usersById.get(userId);
  if (!user) {
    return;
  }

  usersById.delete(userId);
  userIdsByUsername.delete(user.username);

  for (const [tokenHash, session] of sessions) {
    if (session.userId === userId) {
      sessions.delete(tokenHash);
    }
  }

  for (const [conversationId, conversation] of conversations) {
    if (conversation.userId === userId) {
      conversations.delete(conversationId);
      messages.delete(conversationId);
    }
  }
};

export const createSession = async (userId: string, tokenHash: string, expiresAt: Date) => {
  sessions.set(tokenHash, { userId, expiresAt });
};

export const deleteSession = async (tokenHash: string) => {
  sessions.delete(tokenHash);
};

export const listConversations = async (userId: string) =>
  Array.from(conversations.values())
    .filter((conversation) => conversation.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 100)
    .map(mapConversation);

export const createConversation = async (userId: string, title: string, settings: LearningSettings) => {
  const now = new Date().toISOString();
  const conversation: StoredConversation = {
    id: createId(),
    userId,
    title,
    settings,
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: null
  };

  conversations.set(conversation.id, conversation);
  messages.set(conversation.id, []);
  return mapConversation(conversation);
};

export const getConversation = async (userId: string, conversationId: string) => {
  const conversation = ownedConversation(userId, conversationId);
  return {
    conversation: mapConversation(conversation),
    messages: [...(messages.get(conversationId) || [])]
  };
};

export const updateConversationTitle = async (userId: string, conversationId: string, title: string) => {
  const conversation = ownedConversation(userId, conversationId);
  conversation.title = title;
  conversation.updatedAt = new Date().toISOString();
  return mapConversation(conversation);
};

export const deleteConversation = async (userId: string, conversationId: string) => {
  ownedConversation(userId, conversationId);
  conversations.delete(conversationId);
  messages.delete(conversationId);
};

export const reserveUsage = async (userId: string, limit: number) => {
  const key = `${userId}:${new Date().toISOString().slice(0, 10)}`;
  const count = dailyUsage.get(key) || 0;

  if (count >= limit) {
    throw new ApiError(429, "DAILY_LIMIT_REACHED", `오늘의 AI 답변 한도(${limit}회)에 도달했습니다.`);
  }

  const nextCount = count + 1;
  dailyUsage.set(key, nextCount);
  return nextCount;
};

export const appendMessages = async ({
  userId,
  conversationId,
  question,
  settings,
  reply,
  provider,
  model
}: {
  userId: string;
  conversationId: string;
  question: string;
  settings: LearningSettings;
  reply: GeneratedReply;
  provider: string;
  model: string;
}) => {
  const conversation = ownedConversation(userId, conversationId);
  const createdAt = new Date().toISOString();
  const userMessage: Message = {
    id: createId(),
    conversationId,
    role: "user",
    content: question,
    settings,
    response: null,
    provider: null,
    model: null,
    createdAt
  };
  const assistantMessage: Message = {
    id: createId(),
    conversationId,
    role: "assistant",
    content: reply.summary,
    settings,
    response: reply,
    provider,
    model,
    createdAt
  };

  const conversationMessages = messages.get(conversationId) || [];
  conversationMessages.push(userMessage, assistantMessage);
  messages.set(conversationId, conversationMessages);
  conversation.settings = settings;
  conversation.updatedAt = createdAt;
  conversation.lastMessagePreview = assistantMessage.content.slice(0, 140);

  return { userMessage, assistantMessage };
};

export const getConversationContext = async (userId: string, conversationId: string) => {
  ownedConversation(userId, conversationId);
  return (messages.get(conversationId) || []).slice(-12);
};

export const resetMemoryRepository = () => {
  usersById.clear();
  userIdsByUsername.clear();
  sessions.clear();
  conversations.clear();
  messages.clear();
  dailyUsage.clear();
};

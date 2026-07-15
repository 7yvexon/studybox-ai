import {
  defaultLearningSettings,
  normalizeLearningSettings,
  type Conversation,
  type CurrentUser,
  type GeneratedReply,
  type LearningSettings,
  type Message,
  type MessageRole
} from "@studybox/shared";

import { config } from "./config";
import { ApiError } from "./errors";
import { createId } from "./security";

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  real_name: string;
  school_name: string;
  grade: number;
  class_number: number;
  student_number: number;
  role: "user" | "admin";
  created_at: string;
}

interface ConversationRow {
  id: string;
  title: string;
  settings: string;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  settings: string | null;
  response: string | null;
  provider: string | null;
  model: string | null;
  created_at: string;
}

const db = () => {
  if (!config.db) {
    throw new ApiError(503, "DATABASE_UNAVAILABLE", "데이터 저장소를 사용할 수 없습니다.");
  }
  return config.db;
};

const parseJson = (value: string | null): unknown => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const mapUser = (row: UserRow): CurrentUser => ({
  id: row.id,
  username: row.username,
  realName: row.real_name,
  schoolName: row.school_name,
  grade: row.grade,
  classNumber: row.class_number,
  studentNumber: row.student_number,
  role: row.role,
  createdAt: row.created_at
});

const mapConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  title: row.title,
  settings: normalizeLearningSettings(parseJson(row.settings)) || defaultLearningSettings,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastMessagePreview: row.last_message_preview
});

const mapMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  role: row.role,
  content: row.content,
  settings: row.settings ? normalizeLearningSettings(parseJson(row.settings)) : null,
  response: parseJson(row.response) as GeneratedReply | null,
  provider: row.provider,
  model: row.model,
  createdAt: row.created_at
});

export const checkStorageReady = async () => {
  await db().prepare("SELECT 1 AS ready").first();
};

export const findUserByUsername = (username: string) =>
  db().prepare("SELECT * FROM users WHERE username = ?").bind(username).first<UserRow>();

export const getCurrentUserBySession = async (tokenHash: string) => {
  const row = await db()
    .prepare(
      `SELECT users.*
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`
    )
    .bind(tokenHash, new Date().toISOString())
    .first<UserRow>();
  return row ? mapUser(row) : null;
};

export const registerUser = async (input: {
  username: string;
  passwordHash: string;
  realName: string;
  schoolName: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  role: "user" | "admin";
}) => {
  const id = createId();
  const createdAt = new Date().toISOString();
  const result = await db()
    .prepare(
      `INSERT INTO users (
        id, username, password_hash, real_name, school_name, grade, class_number, student_number, role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO NOTHING`
    )
    .bind(
      id,
      input.username,
      input.passwordHash,
      input.realName,
      input.schoolName,
      input.grade,
      input.classNumber,
      input.studentNumber,
      input.role,
      createdAt
    )
    .run();

  if (result.meta.changes === 0) {
    throw new ApiError(409, "USERNAME_IN_USE", "이미 사용 중인 아이디입니다.");
  }

  return mapUser({
    id,
    username: input.username,
    password_hash: input.passwordHash,
    real_name: input.realName,
    school_name: input.schoolName,
    grade: input.grade,
    class_number: input.classNumber,
    student_number: input.studentNumber,
    role: input.role,
    created_at: createdAt
  });
};

export const deleteUser = async (userId: string) => {
  await db().prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
};

export const createSession = async (userId: string, tokenHash: string, expiresAt: Date) => {
  await db()
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(createId(), userId, tokenHash, expiresAt.toISOString(), new Date().toISOString())
    .run();
};

export const deleteSession = async (tokenHash: string) => {
  await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
};

export const listConversations = async (userId: string) => {
  const result = await db()
    .prepare(
      `SELECT id, title, settings, created_at, updated_at, last_message_preview
       FROM conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 100`
    )
    .bind(userId)
    .all<ConversationRow>();
  return result.results.map(mapConversation);
};

export const createConversation = async (userId: string, title: string, settings: LearningSettings) => {
  const id = createId();
  const now = new Date().toISOString();
  await db()
    .prepare(
      `INSERT INTO conversations (id, user_id, title, settings, last_message_preview, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`
    )
    .bind(id, userId, title, JSON.stringify(settings), now, now)
    .run();
  return mapConversation({
    id,
    title,
    settings: JSON.stringify(settings),
    created_at: now,
    updated_at: now,
    last_message_preview: null
  });
};

const ownedConversation = async (userId: string, conversationId: string) => {
  const row = await db()
    .prepare(
      `SELECT id, title, settings, created_at, updated_at, last_message_preview
       FROM conversations WHERE id = ? AND user_id = ?`
    )
    .bind(conversationId, userId)
    .first<ConversationRow>();
  if (!row) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "대화를 찾을 수 없습니다.");
  }
  return row;
};

export const getConversation = async (
  userId: string,
  conversationId: string,
  { limit = 50, before }: { limit?: number; before?: string } = {}
) => {
  const conversation = await ownedConversation(userId, conversationId);
  const cursor = before
    ? await db()
        .prepare("SELECT id, created_at FROM messages WHERE id = ? AND conversation_id = ?")
        .bind(before, conversationId)
        .first<{ id: string; created_at: string }>()
    : null;

  if (before && !cursor) {
    throw new ApiError(400, "INVALID_MESSAGE_CURSOR", "메시지 위치 정보가 올바르지 않습니다.");
  }

  const result = cursor
    ? await db()
        .prepare(
          `SELECT * FROM messages
           WHERE conversation_id = ? AND (created_at < ? OR (created_at = ? AND id < ?))
           ORDER BY created_at DESC, id DESC
           LIMIT ?`
        )
        .bind(conversationId, cursor.created_at, cursor.created_at, cursor.id, limit + 1)
        .all<MessageRow>()
    : await db()
        .prepare(
          `SELECT * FROM messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT ?`
        )
        .bind(conversationId, limit + 1)
        .all<MessageRow>();

  const hasMore = result.results.length > limit;
  const page = result.results.slice(0, limit).reverse().map(mapMessage);
  return {
    conversation: mapConversation(conversation),
    messages: page,
    nextCursor: hasMore ? page[0]?.id ?? null : null
  };
};

export const updateConversationTitle = async (userId: string, conversationId: string, title: string) => {
  await ownedConversation(userId, conversationId);
  const updatedAt = new Date().toISOString();
  await db()
    .prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(title, updatedAt, conversationId, userId)
    .run();
  const row = await ownedConversation(userId, conversationId);
  return mapConversation(row);
};

export const deleteConversation = async (userId: string, conversationId: string) => {
  await ownedConversation(userId, conversationId);
  await db().prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").bind(conversationId, userId).run();
};

export const reserveUsage = async (userId: string, limit: number) => {
  const result = await db()
    .prepare(
      `INSERT INTO daily_usage (user_id, usage_date, request_count)
       VALUES (?, date('now'), 1)
       ON CONFLICT(user_id, usage_date)
       DO UPDATE SET request_count = daily_usage.request_count + 1
       WHERE daily_usage.request_count < ?
       RETURNING request_count`
    )
    .bind(userId, limit)
    .first<{ request_count: number }>();
  if (!result) {
    throw new ApiError(429, "DAILY_LIMIT_REACHED", `오늘의 AI 답변 한도(${limit}회)에 도달했습니다.`);
  }
  return result.request_count;
};

export const releaseUsage = async (userId: string) => {
  const database = db();
  await database.batch([
    database
      .prepare("DELETE FROM daily_usage WHERE user_id = ? AND usage_date = date('now') AND request_count <= 1")
      .bind(userId),
    database
      .prepare("UPDATE daily_usage SET request_count = request_count - 1 WHERE user_id = ? AND usage_date = date('now') AND request_count > 1")
      .bind(userId)
  ]);
};

const insertMessageStatement = (message: {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  settings: LearningSettings | null;
  response: GeneratedReply | null;
  provider: string | null;
  model: string | null;
  createdAt: string;
}) =>
  db()
    .prepare(
      `INSERT INTO messages (id, conversation_id, role, content, settings, response, provider, model, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.settings ? JSON.stringify(message.settings) : null,
      message.response ? JSON.stringify(message.response) : null,
      message.provider,
      message.model,
      message.createdAt
    );

export const appendMessages = async (input: {
  userId: string;
  conversationId: string;
  question: string;
  settings: LearningSettings;
  reply: GeneratedReply;
  provider: string;
  model: string;
}) => {
  await ownedConversation(input.userId, input.conversationId);
  const userCreatedAt = new Date().toISOString();
  const assistantCreatedAt = new Date(Date.now() + 1).toISOString();
  const userMessage: Message = {
    id: createId(),
    conversationId: input.conversationId,
    role: "user",
    content: input.question,
    settings: input.settings,
    response: null,
    provider: null,
    model: null,
    createdAt: userCreatedAt
  };
  const assistantMessage: Message = {
    id: createId(),
    conversationId: input.conversationId,
    role: "assistant",
    content: input.reply.summary,
    settings: input.settings,
    response: input.reply,
    provider: input.provider,
    model: input.model,
    createdAt: assistantCreatedAt
  };
  const database = db();
  await database.batch([
    insertMessageStatement(userMessage),
    insertMessageStatement(assistantMessage),
    database
      .prepare(
        "UPDATE conversations SET settings = ?, updated_at = ?, last_message_preview = ? WHERE id = ? AND user_id = ?"
      )
      .bind(
        JSON.stringify(input.settings),
        assistantCreatedAt,
        input.reply.summary.slice(0, 140),
        input.conversationId,
        input.userId
      )
  ]);
  return { userMessage, assistantMessage };
};

export const getConversationContext = async (userId: string, conversationId: string) => {
  await ownedConversation(userId, conversationId);
  const result = await db()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 12")
    .bind(conversationId)
    .all<MessageRow>();
  return result.results.reverse().map(mapMessage);
};

export const consumeRateLimit = async (key: string, windowMs: number, limit: number) => {
  const database = db();
  const now = Date.now();
  const current = await database
    .prepare("SELECT window_started_at, request_count FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<{ window_started_at: number; request_count: number }>();

  if (!current || current.window_started_at <= now - windowMs) {
    await database
      .prepare(
        `INSERT INTO rate_limits (key, window_started_at, request_count)
         VALUES (?, ?, 1)
         ON CONFLICT(key) DO UPDATE SET window_started_at = excluded.window_started_at, request_count = 1`
      )
      .bind(key, now)
      .run();
    return;
  }

  if (current.request_count >= limit) {
    throw new ApiError(429, "RATE_LIMIT_REACHED", "잠시 후 다시 시도해 주세요.");
  }

  await database.prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE key = ?").bind(key).run();
};

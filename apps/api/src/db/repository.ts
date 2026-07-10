import type {
  Conversation,
  CurrentUser,
  GeneratedReply,
  LearningSettings,
  Message,
  MessageRole
} from "@studybox/shared";
import type { PoolClient } from "pg";

import { transaction, query } from "./index.js";
import { ApiError } from "../lib/http.js";
import { createId } from "../lib/security.js";

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
  created_at: Date;
}

interface ConversationRow {
  id: string;
  title: string;
  settings: LearningSettings;
  created_at: Date;
  updated_at: Date;
  last_message_preview: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  settings: LearningSettings | null;
  response: GeneratedReply | null;
  provider: string | null;
  model: string | null;
  created_at: Date;
}

const mapUser = (row: UserRow): CurrentUser => ({
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

const mapConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  title: row.title,
  settings: row.settings,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  lastMessagePreview: row.last_message_preview
});

const mapMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  role: row.role,
  content: row.content,
  settings: row.settings,
  response: row.response,
  provider: row.provider,
  model: row.model,
  createdAt: row.created_at.toISOString()
});

export const findUserByUsername = async (username: string) => {
  const result = await query<UserRow>("SELECT * FROM users WHERE username = $1", [username]);
  return result.rows[0] ?? null;
};

export const findUserById = async (id: string) => {
  const result = await query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
};

export const getCurrentUserBySession = async (tokenHash: string) => {
  const result = await query<UserRow>(
    `SELECT users.*
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
    [tokenHash]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
};

export const registerUser = async ({
  username,
  passwordHash,
  inviteHash,
  realName,
  schoolName,
  grade,
  classNumber,
  studentNumber,
  role
}: {
  username: string;
  passwordHash: string;
  inviteHash: string;
  realName: string;
  schoolName: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  role: "user" | "admin";
}) =>
  transaction(async (client) => {
    const invite = await client.query<{ id: string }>(
      `SELECT id FROM invite_codes
       WHERE code_hash = $1 AND used_by IS NULL AND (expires_at IS NULL OR expires_at > NOW())
       FOR UPDATE`,
      [inviteHash]
    );

    if (!invite.rows[0]) {
      throw new ApiError(400, "INVALID_INVITE_CODE", "초대 코드가 올바르지 않거나 이미 사용되었습니다.");
    }

    const existing = await client.query("SELECT 1 FROM users WHERE username = $1", [username]);

    if (existing.rowCount) {
      throw new ApiError(409, "USERNAME_IN_USE", "이미 사용 중인 아이디입니다.");
    }

    const id = createId();
    const result = await client.query<UserRow>(
      `INSERT INTO users (
        id, username, password_hash, real_name, school_name, grade, class_number, student_number, role
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, username, passwordHash, realName, schoolName, grade, classNumber, studentNumber, role]
    );

    await client.query(
      "UPDATE invite_codes SET used_by = $1, used_at = NOW() WHERE id = $2",
      [id, invite.rows[0].id]
    );

    return mapUser(result.rows[0]);
  });

export const deleteUser = async (userId: string) => {
  await query("DELETE FROM users WHERE id = $1", [userId]);
};

export const createSession = async (userId: string, tokenHash: string, expiresAt: Date) => {
  await query(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [createId(), userId, tokenHash, expiresAt]
  );
};

export const deleteSession = async (tokenHash: string) => {
  await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
};


export const createInviteCode = async ({
  codeHash,
  createdBy,
  expiresAt
}: {
  codeHash: string;
  createdBy: string;
  expiresAt: Date | null;
}) => {
  await query(
    `INSERT INTO invite_codes (id, code_hash, created_by, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [createId(), codeHash, createdBy, expiresAt]
  );
};

export const listConversations = async (userId: string) => {
  const result = await query<ConversationRow>(
    `SELECT conversations.*, (
      SELECT LEFT(messages.content, 140)
      FROM messages
      WHERE messages.conversation_id = conversations.id
      ORDER BY messages.created_at DESC
      LIMIT 1
    ) AS last_message_preview
    FROM conversations
    WHERE user_id = $1
    ORDER BY updated_at DESC
    LIMIT 100`,
    [userId]
  );

  return result.rows.map(mapConversation);
};

export const createConversation = async (userId: string, title: string, settings: LearningSettings) => {
  const result = await query<ConversationRow>(
    `INSERT INTO conversations (id, user_id, title, settings)
     VALUES ($1, $2, $3, $4)
     RETURNING *, NULL::TEXT AS last_message_preview`,
    [createId(), userId, title, settings]
  );

  return mapConversation(result.rows[0]);
};

export const getConversation = async (userId: string, conversationId: string) => {
  const conversationResult = await query<ConversationRow>(
    `SELECT conversations.*, NULL::TEXT AS last_message_preview
     FROM conversations WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  const conversation = conversationResult.rows[0];

  if (!conversation) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "대화를 찾을 수 없습니다.");
  }

  const messages = await query<MessageRow>(
    "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [conversationId]
  );

  return { conversation: mapConversation(conversation), messages: messages.rows.map(mapMessage) };
};

export const updateConversationTitle = async (userId: string, conversationId: string, title: string) => {
  const result = await query<ConversationRow>(
    `UPDATE conversations
     SET title = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *, NULL::TEXT AS last_message_preview`,
    [title, conversationId, userId]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "대화를 찾을 수 없습니다.");
  }

  return mapConversation(result.rows[0]);
};

export const deleteConversation = async (userId: string, conversationId: string) => {
  const result = await query("DELETE FROM conversations WHERE id = $1 AND user_id = $2", [
    conversationId,
    userId
  ]);

  if (!result.rowCount) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "대화를 찾을 수 없습니다.");
  }
};

export const reserveUsage = async (userId: string, limit: number) => {
  const result = await query<{ request_count: number }>(
    `INSERT INTO daily_usage (user_id, usage_date, request_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, usage_date)
     DO UPDATE SET request_count = daily_usage.request_count + 1
     WHERE daily_usage.request_count < $2
     RETURNING request_count`,
    [userId, limit]
  );

  if (!result.rows[0]) {
    throw new ApiError(429, "DAILY_LIMIT_REACHED", `오늘의 AI 답변 한도(${limit}회)에 도달했습니다.`);
  }

  return result.rows[0].request_count;
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
}) =>
  transaction(async (client) => {
    const owner = await client.query("SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2 FOR UPDATE", [
      conversationId,
      userId
    ]);

    if (!owner.rowCount) {
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "대화를 찾을 수 없습니다.");
    }

    const userMessage = await insertMessage(client, {
      conversationId,
      role: "user",
      content: question,
      settings,
      response: null,
      provider: null,
      model: null
    });
    const assistantMessage = await insertMessage(client, {
      conversationId,
      role: "assistant",
      content: reply.summary,
      settings,
      response: reply,
      provider,
      model
    });

    await client.query("UPDATE conversations SET settings = $1, updated_at = NOW() WHERE id = $2", [
      settings,
      conversationId
    ]);

    return { userMessage: mapMessage(userMessage), assistantMessage: mapMessage(assistantMessage) };
  });

const insertMessage = async (
  client: PoolClient,
  message: {
    conversationId: string;
    role: MessageRole;
    content: string;
    settings: LearningSettings | null;
    response: GeneratedReply | null;
    provider: string | null;
    model: string | null;
  }
) => {
  const result = await client.query<MessageRow>(
    `INSERT INTO messages (id, conversation_id, role, content, settings, response, provider, model)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      createId(),
      message.conversationId,
      message.role,
      message.content,
      message.settings,
      message.response,
      message.provider,
      message.model
    ]
  );

  return result.rows[0];
};

export const getConversationContext = async (userId: string, conversationId: string) => {
  const owner = await query("SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2", [
    conversationId,
    userId
  ]);

  if (!owner.rowCount) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "대화를 찾을 수 없습니다.");
  }

  const result = await query<MessageRow>(
    `SELECT * FROM messages WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT 12`,
    [conversationId]
  );

  return result.rows.reverse().map(mapMessage);
};

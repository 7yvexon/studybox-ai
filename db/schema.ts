import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    realName: text("real_name").notNull(),
    schoolName: text("school_name").notNull(),
    grade: integer("grade").notNull(),
    classNumber: integer("class_number").notNull(),
    studentNumber: integer("student_number").notNull(),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    createdAt: text("created_at").notNull()
  },
  (table) => [uniqueIndex("users_username_idx").on(table.username)]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt)
  ]
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    settings: text("settings").notNull(),
    lastMessagePreview: text("last_message_preview"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [index("conversations_user_updated_idx").on(table.userId, table.updatedAt)]
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    settings: text("settings"),
    response: text("response"),
    provider: text("provider"),
    model: text("model"),
    createdAt: text("created_at").notNull()
  },
  (table) => [index("messages_conversation_created_idx").on(table.conversationId, table.createdAt)]
);

export const dailyUsage = sqliteTable(
  "daily_usage",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    usageDate: text("usage_date").notNull(),
    requestCount: integer("request_count").notNull().default(0)
  },
  (table) => [primaryKey({ columns: [table.userId, table.usageDate] })]
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull()
});

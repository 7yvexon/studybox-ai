import { config } from "../config.js";
import { query } from "../db/index.js";
import * as postgresRepository from "../db/repository.js";
import * as memoryRepository from "./memory-repository.js";

type StorageRepository = {
  findUserByUsername: typeof postgresRepository.findUserByUsername;
  getCurrentUserBySession: typeof postgresRepository.getCurrentUserBySession;
  registerUser: typeof postgresRepository.registerUser;
  deleteUser: typeof postgresRepository.deleteUser;
  createSession: typeof postgresRepository.createSession;
  deleteSession: typeof postgresRepository.deleteSession;
  listConversations: typeof postgresRepository.listConversations;
  createConversation: typeof postgresRepository.createConversation;
  getConversation: typeof postgresRepository.getConversation;
  updateConversationTitle: typeof postgresRepository.updateConversationTitle;
  deleteConversation: typeof postgresRepository.deleteConversation;
  reserveUsage: typeof postgresRepository.reserveUsage;
  appendMessages: typeof postgresRepository.appendMessages;
  getConversationContext: typeof postgresRepository.getConversationContext;
};

const memoryStorage: StorageRepository = memoryRepository;
const storage: StorageRepository = config.storageMode === "memory" ? memoryStorage : postgresRepository;

export const {
  findUserByUsername,
  getCurrentUserBySession,
  registerUser,
  deleteUser,
  createSession,
  deleteSession,
  listConversations,
  createConversation,
  getConversation,
  updateConversationTitle,
  deleteConversation,
  reserveUsage,
  appendMessages,
  getConversationContext
} = storage;

export const checkStorageReady = async () => {
  if (config.storageMode === "postgres") {
    await query("SELECT 1");
  }
};

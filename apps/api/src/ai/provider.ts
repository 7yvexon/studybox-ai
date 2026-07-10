import type { ChatProvider } from "@studybox/shared";

import type { AppConfig } from "../config.js";
import { MockChatProvider } from "./mock-provider.js";
import { OpenAiCompatibleChatProvider } from "./openai-compatible-provider.js";

export const createChatProvider = (appConfig: AppConfig): ChatProvider => {
  if (appConfig.aiProvider === "openai-compatible") {
    return new OpenAiCompatibleChatProvider(appConfig);
  }

  return new MockChatProvider();
};

import type { CurrentUser } from "@studybox/shared";

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

export {};

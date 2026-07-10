import type { CookieOptions, NextFunction, Request, Response } from "express";

import { config } from "../config.js";
import { getCurrentUserBySession } from "../db/repository.js";
import { ApiError } from "../lib/http.js";
import { hashToken } from "../lib/security.js";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax",
  path: "/",
  maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000
};

export const setSessionCookie = (response: Response, token: string) => {
  response.cookie(config.sessionCookieName, token, cookieOptions);
};

export const clearSessionCookie = (response: Response) => {
  response.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/"
  });
};

export const requireAuth = async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const token = request.cookies?.[config.sessionCookieName];

    if (!token || typeof token !== "string") {
      throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
    }

    const user = await getCurrentUserBySession(hashToken(token));

    if (!user) {
      throw new ApiError(401, "SESSION_EXPIRED", "로그인 상태가 만료되었습니다.");
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireSameOrigin = (request: Request, _response: Response, next: NextFunction) => {
  const origin = request.get("origin");

  if (!origin) {
    next();
    return;
  }

  if (origin !== new URL(config.appOrigin).origin) {
    next(new ApiError(403, "ORIGIN_NOT_ALLOWED", "허용되지 않은 요청입니다."));
    return;
  }

  next();
};

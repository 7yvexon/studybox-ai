import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const parseBody = <T>(schema: ZodType<T>, request: Request): T => {
  const result = schema.safeParse(request.body);

  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "입력 내용을 다시 확인해 주세요.");
  }

  return result.data;
};

export const notFound = (_request: Request, _response: Response, next: NextFunction) => {
  next(new ApiError(404, "NOT_FOUND", "요청한 기능을 찾을 수 없습니다."));
};

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "입력 내용을 다시 확인해 주세요." }
    });
    return;
  }

  response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." }
  });
};

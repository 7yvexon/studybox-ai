import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const errorResponse = (error: unknown) => {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }

  if (error instanceof ZodError || error instanceof SyntaxError) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "입력 내용을 다시 확인해 주세요." } },
      { status: 400 }
    );
  }

  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." } },
    { status: 500 }
  );
};

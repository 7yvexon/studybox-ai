import { handleApi } from "../../../sites/api";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

const dispatch = async (request: Request, context: RouteContext) => {
  const { path } = await context.params;
  return handleApi(request, path);
};

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;

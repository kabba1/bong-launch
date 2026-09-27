import { handleApi } from "@/server/services/router";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
async function route(request: Request, context: Context) {
  return handleApi(request, (await context.params).path);
}
export {
  route as GET,
  route as POST,
  route as PATCH,
  route as DELETE,
  route as OPTIONS,
};

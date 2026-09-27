import "server-only";
import { headers } from "next/headers";
import { readPageData } from "@/server/services/page-read";
import { origin } from "./site";
export async function pageData<T>(
  action: "post.get" | "member.get",
  payload: Record<string, unknown>,
) {
  const source = await headers();
  return readPageData<T>(
    new Request(`${origin()}/api/page-read`, { headers: source }),
    action,
    payload,
  );
}
export function missing(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    (("code" in error && error.code === "NOT_FOUND") ||
      ("message" in error && error.message === "NOT_FOUND"))
  );
}

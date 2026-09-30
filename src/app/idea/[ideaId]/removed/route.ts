import overrides from "../../../../../content/idea-overrides.json";
import { getIdeaStatus } from "@/server/content";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return overrides.excludedIds.map((ideaId: string) => ({ ideaId }));
}

/** Rewritten canonical withdrawals retain 410 without running the public proxy. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> },
) {
  if (getIdeaStatus((await params).ideaId) !== "withdrawn")
    return new Response("Not found", { status: 404 });
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Idea withdrawn · BONG</title></head><body><main><h1>This idea has been withdrawn.</h1><p>It is no longer part of the public collection.</p><a href="/">Back to the Bong</a></main></body></html>',
    { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

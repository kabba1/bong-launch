import { ImageResponse } from "next/og";
import { getIdea, getCorpusManifest, getAllIdeas } from "@/server/content";
export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return getAllIdeas().map(({ id }) => ({ ideaId: id }));
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> },
) {
  const { ideaId } = await params;
  const idea = getIdea(ideaId);
  if (!idea) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: "#fff8ee",
        padding: "65px",
        color: "#191511",
        fontFamily: "sans-serif",
        borderBottom: "22px solid #ff6a00",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        <span>BONG</span>
        <span>{idea.id}</span>
      </div>
      <div style={{ display: "flex", fontSize: 49, lineHeight: 1.25 }}>
        {idea.text}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, must-revalidate",
        ETag: `"${getCorpusManifest().hash}-${idea.id}"`,
      },
    },
  );
}

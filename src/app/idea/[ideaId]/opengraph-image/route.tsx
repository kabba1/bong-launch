import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getIdea, getCorpusManifest, getAllIdeas } from "@/server/content";
const displayFont = readFile(
  join(
    process.cwd(),
    "node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff",
  ),
);
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
        background: "linear-gradient(135deg, #f1fbfd 35%, #9fe3f0)",
        padding: "60px 65px",
        color: "#062a3a",
        fontFamily: "Bricolage Grotesque",
        fontWeight: 800,
        borderBottom: "22px solid #062a3a",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 62, letterSpacing: "-3px" }}>BONG</span>
        <span
          style={{
            fontSize: 24,
            background: "#ffd23f",
            border: "3px solid #062a3a",
            borderRadius: "99px",
            padding: "10px 20px",
          }}
        >
          {idea.id}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 54,
          lineHeight: 1.15,
          letterSpacing: "-1px",
        }}
      >
        {idea.text}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Bricolage Grotesque",
          data: await displayFont,
          weight: 800,
          style: "normal",
        },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600, must-revalidate",
        ETag: `"${getCorpusManifest().hash}-${idea.id}-aqua-v1"`,
      },
    },
  );
}

import { redirect } from "next/navigation";
import { communityEnabled } from "@/lib/launch-scope";

/** Defense in depth behind the pre-render proxy boundary. */
export function CommunityBoundary({ children }: { children: React.ReactNode }) {
  if (!communityEnabled()) redirect("/community");
  return children;
}

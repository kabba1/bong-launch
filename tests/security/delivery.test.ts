import { describe, it, expect } from "vitest";
import { issueAuthorizedUrl } from "../../src/server/media/delivery";

describe("MEDIA-09/10/PRIV-01 delivery authorization during provider latency", () => {
  it("withholds a newly signed URL when resource permission changes during signing", async () => {
    let visible = true;
    const authorize = async () => {
      if (!visible) throw new Error("NOT_FOUND");
      return "fixed-private-key";
    };
    const sign = async () => {
      visible = false;
      return "https://provider.test/secret-signed-url";
    };
    await expect(issueAuthorizedUrl(authorize, sign)).rejects.toThrow(
      "NOT_FOUND",
    );
  });
  it("withholds an old resource link if the authorized key changes", async () => {
    let key = "before";
    await expect(
      issueAuthorizedUrl(
        async () => key,
        async () => {
          key = "after";
          return "secret-link";
        },
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("returns a fixed provider URL only when final authorization still permits it", async () => {
    await expect(
      issueAuthorizedUrl(
        async () => "known-key",
        async (key) => `https://provider.test/${key}`,
      ),
    ).resolves.toBe("https://provider.test/known-key");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const settings = vi.hoisted(() => ({ contacts: {} as { security?: string } }));
vi.mock("../../src/lib/site", () => ({
  publicSettings: settings,
  origin: () => "https://owned.example",
}));
import { GET } from "../../src/app/.well-known/security.txt/route";
beforeEach(() => {
  settings.contacts = {};
});
afterEach(() => {
  vi.unstubAllEnvs();
});
describe("optional security.txt", () => {
  it("returns an ordinary absence without inventing a contact or launch failure", async () => {
    const response = GET();
    expect(response.status).toBe(404);
    expect(await response.text()).not.toMatch(/launch|blocked|mailto:/i);
  });
  it("does not publish an incomplete configured contact", () => {
    settings.contacts.security = "test-only@owned.example";
    vi.stubEnv("SECURITY_TXT_EXPIRES", "");
    expect(GET().status).toBe(503);
  });
  it("retains explicit contact publication when the operator configures it", async () => {
    settings.contacts.security = "test-only@owned.example";
    vi.stubEnv("SECURITY_TXT_EXPIRES", "2099-01-01T00:00:00Z");
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      "Contact: mailto:test-only@owned.example",
    );
  });
});

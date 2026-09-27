import "dotenv/config";
import { z } from "zod";
import { dbOwnerAction } from "../src/server/db/owner";
import { verifiedStaffIdentity } from "../src/server/auth/administration";
const input = z.strictObject({
  action: z.enum(["grant", "revoke", "recover"]),
  userId: z.uuid(),
  role: z.enum(["admin", "moderator"]).optional(),
  factorId: z.uuid().optional(),
  reason: z.string().min(10).max(1000),
});
try {
  const args = process.argv.slice(2);
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i].startsWith("--") || !args[i + 1])
      throw new Error("Arguments must use --name value.");
    values[args[i].slice(2)] = args[i + 1];
  }
  const parsed = input.parse(values);
  if (parsed.action === "grant" && !parsed.role)
    throw new Error("Grant requires --role.");
  if (parsed.action === "recover" && !parsed.factorId)
    throw new Error("Recovery requires a verified --factorId.");
  await verifiedStaffIdentity(parsed.userId, parsed.factorId);
  await dbOwnerAction(`staff.${parsed.action}`, {
    userId: parsed.userId,
    role: parsed.role,
    factorId: parsed.factorId,
    reason: parsed.reason,
  });
  console.info("The audited staff change was committed.");
} catch {
  console.error(
    "Staff change failed. Supply a verified provider UUID, approved factor where required, reason, and separate owner credentials. No role change is assumed successful.",
  );
  process.exitCode = 1;
}

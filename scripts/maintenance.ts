import "dotenv/config";
import { randomUUID } from "node:crypto";
// Run with Node --conditions=react-server so server-only's server condition is selected.
import { runMaintenance } from "../src/server/services/maintenance";
import { closeDatabase } from "../src/server/db/database";
try {
  console.info(JSON.stringify(await runMaintenance(randomUUID())));
} catch {
  console.error(
    "Maintenance failed. Check the restricted job queue and provider status.",
  );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

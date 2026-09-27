import "dotenv/config";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
import { runContentCommand } from "./content";
import { communityEnabled } from "../src/lib/launch-scope";

// Run only in a specifically authorized local/staging/deployment environment.
// Credentials are supplied by a secret manager, never arguments or logged URLs.
if (!communityEnabled()) {
  console.error("Community is disabled. No database was changed.");
  process.exit(1);
}
const connectionString = process.env.BONG_MIGRATION_DATABASE_URL;
if (!connectionString) {
  console.error(
    "BONG_MIGRATION_DATABASE_URL is required. No database was changed.",
  );
  process.exitCode = 1;
} else {
  const sql = postgres(connectionString, {
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.BONG_DATABASE_CA_CERT
        ? { ca: process.env.BONG_DATABASE_CA_CERT }
        : {}),
    },
    prepare: false,
    max: 1,
    connect_timeout: 5,
    idle_timeout: 10,
    connection: {
      application_name: "bong-migrations",
      statement_timeout: 60000,
    },
    onnotice: () => {},
  });
  try {
    runContentCommand("validate");
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(629482734)`;
      await tx.unsafe(
        "CREATE SCHEMA IF NOT EXISTS bong_deploy; REVOKE ALL ON SCHEMA bong_deploy FROM PUBLIC; CREATE TABLE IF NOT EXISTS bong_deploy.migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());",
      );
      const folder = resolve("supabase/migrations");
      const files = (await readdir(folder))
        .filter((file) => /^\d{12,}_[a-z0-9_]+\.sql$/.test(file))
        .sort();
      if (!files.length) throw new Error("NO_MIGRATIONS");
      for (const file of files) {
        const source = await readFile(resolve(folder, file), "utf8");
        const hash = createHash("sha256").update(source).digest("hex");
        const installed = await tx<
          { sha256: string }[]
        >`select sha256 from bong_deploy.migrations where name=${file}`;
        if (installed.length) {
          if (installed[0]!.sha256 !== hash) throw new Error("MIGRATION_DRIFT");
          continue;
        }
        // Each checked-in migration remains executable on its own. Here the
        // runner owns one encompassing transaction for SQL + checksum history.
        await tx.unsafe(
          source.replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, ""),
        );
        await tx`insert into bong_deploy.migrations(name,sha256) values(${file},${hash})`;
      }
      const catalog = await readFile(
        resolve("content/generated/catalog.sql"),
        "utf8",
      );
      await tx.unsafe(
        catalog.replace(/^BEGIN;\s*$/m, "").replace(/^COMMIT;\s*$/m, ""),
      );
    });
    console.info(
      "Migrations and the exact validated 1,000-ID catalog committed. Hosted role, provider-bypass and restore verification remain separate release checks.",
    );
  } catch {
    console.error(
      "Migration failed; no success is assumed. Check connectivity, verified TLS, migration authority, checksum drift and reviewed SQL. Database errors are intentionally not printed because they can contain private values.",
    );
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

import "server-only";
import { createHmac } from "node:crypto";
import postgres, { type TransactionSql } from "postgres";

export type Actor = Readonly<{
  userId: string | null;
  sessionId: string | null;
  aal: "aal1" | "aal2";
  requestId: string;
}>;

let runtime: ReturnType<typeof postgres> | undefined;
let maintenance: ReturnType<typeof postgres> | undefined;

function connect(
  variable: "BONG_DATABASE_URL" | "BONG_MAINTENANCE_DATABASE_URL",
) {
  const connectionString = process.env[variable];
  if (!connectionString) throw new Error("SERVICE_UNAVAILABLE");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("SERVICE_UNAVAILABLE");
  // The server's certificate and hostname are verified. Never fall back to
  // rejectUnauthorized:false. Pooler URLs/CA certificates come from the owner.
  return postgres(connectionString, {
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.BONG_DATABASE_CA_CERT
        ? { ca: process.env.BONG_DATABASE_CA_CERT }
        : {}),
    },
    prepare: false,
    max: variable === "BONG_DATABASE_URL" ? 3 : 1,
    connect_timeout: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connection: {
      application_name:
        variable === "BONG_DATABASE_URL" ? "bong-runtime" : "bong-maintenance",
      statement_timeout: variable === "BONG_DATABASE_URL" ? 5000 : 30000,
    },
    onnotice: () => {
      /* Database notices must not print private input. */
    },
  });
}

/** Every actor operation, including anonymous reads, stays on this transaction. */
export async function withActorTransaction<T>(
  actor: Actor,
  work: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  let rateSubject = "";
  if (actor.userId) {
    const rateSecret = process.env.RATE_LIMIT_SECRET;
    if (!rateSecret || Buffer.byteLength(rateSecret) < 32)
      throw new Error("SERVICE_UNAVAILABLE");
    rateSubject = createHmac("sha256", rateSecret)
      .update(`user\0${actor.userId}`)
      .digest("hex");
  }
  runtime ??= connect("BONG_DATABASE_URL");
  const result = await runtime.begin(async (tx) => {
    // Fail closed on a accidentally supplied privileged database credential.
    const identity = await tx<{ valid: boolean }[]>`
      select current_user = 'bong_runtime' and not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb as valid
      from pg_roles where rolname = current_user`;
    if (identity[0]?.valid !== true) throw new Error("UNSAFE_DATABASE_ROLE");
    await tx`select set_config('app.actor_id', ${actor.userId ?? ""}, true),
      set_config('app.session_id', ${actor.sessionId ?? ""}, true),
      set_config('app.actor_aal', ${actor.aal}, true),
      set_config('app.request_id', ${actor.requestId}, true),
      set_config('app.rate_subject', ${rateSubject}, true)`;
    return work(tx);
  });
  return result as T;
}

export async function dbAction<T = Record<string, unknown>>(
  actor: Actor,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  try {
    return await withActorTransaction(actor, async (tx) => {
      const rows = await tx<
        { result: T }[]
      >`select bong.api(${action}, ${JSON.stringify(payload)}::jsonb) as result`;
      return rows[0]!.result;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      const failure = error as Error & { detail?: string; retryAfter?: number };
      if (failure.detail && /^\d{1,6}$/.test(failure.detail))
        failure.retryAfter = Math.max(
          1,
          Math.min(86400, Number(failure.detail)),
        );
    }
    throw error;
  }
}

/** Only internal scheduled workers call this; never an end-user actor. */
export async function dbMaintenanceAction<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  maintenance ??= connect("BONG_MAINTENANCE_DATABASE_URL");
  const result = await maintenance.begin(async (tx) => {
    const identity = await tx<{ valid: boolean }[]>`
      select current_user = 'bong_maintenance' and not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb as valid
      from pg_roles where rolname = current_user`;
    if (identity[0]?.valid !== true) throw new Error("UNSAFE_DATABASE_ROLE");
    const rows = await tx<
      { result: T }[]
    >`select bong.maintenance_api(${action}, ${JSON.stringify(payload)}::jsonb) as result`;
    return rows[0]!.result;
  });
  return result as T;
}

export async function closeDatabase(): Promise<void> {
  await Promise.all([
    runtime?.end({ timeout: 5 }),
    maintenance?.end({ timeout: 5 }),
  ]);
  runtime = undefined;
  maintenance = undefined;
}

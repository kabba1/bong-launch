// Owner command module. Never import from an HTTP request module or client.
import "server-only";
import postgres from "postgres";

export async function dbOwnerAction<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const connectionString = process.env.BONG_OWNER_DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "BONG_OWNER_DATABASE_URL is required for this owner-operated command.",
    );
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
      application_name: "bong-owner-command",
      statement_timeout: 30000,
    },
    onnotice: () => {},
  });
  try {
    return (await sql.begin(async (tx) => {
      const result = await tx<
        { result: T }[]
      >`select bong.owner_api(${action}, ${JSON.stringify(payload)}::jsonb) as result`;
      return result[0]!.result;
    })) as T;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

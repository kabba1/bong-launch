import "server-only";
import { createClient } from "@supabase/supabase-js";
import { providerConfig, required } from "../config/env";
import { unavailable } from "../security/errors";
function administration() {
  return createClient(
    providerConfig().url,
    required("SUPABASE_AUTH_ADMIN_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
          }),
      },
    },
  ).auth.admin;
}
export async function deleteProviderIdentity(userId: string) {
  const result = await administration().deleteUser(userId, false);
  if (
    result.error &&
    result.error.code !== "user_not_found" &&
    result.error.status !== 404
  )
    throw unavailable();
}
export async function verifiedStaffIdentity(userId: string, factorId?: string) {
  const result = await administration().getUserById(userId);
  if (result.error || !result.data.user?.email_confirmed_at)
    throw new Error(
      "The owner command requires an existing verified provider user.",
    );
  if (
    factorId &&
    !result.data.user.factors?.some(
      (f) =>
        f.id === factorId &&
        f.factor_type === "totp" &&
        f.status === "verified",
    )
  )
    throw new Error(
      "The supplied factor is not a verified TOTP factor belonging to this user.",
    );
  return result.data.user.id;
}

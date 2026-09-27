import { ApiError } from "../security/errors";

/** Storage calls occur outside SQL transactions; check again before disclosing their URL. */
export async function issueAuthorizedUrl(
  authorize: () => Promise<string>,
  sign: (key: string) => Promise<string>,
) {
  const key = await authorize();
  const url = await sign(key);
  if ((await authorize()) !== key)
    throw new ApiError(404, "NOT_FOUND", "This item is not available.");
  return url;
}

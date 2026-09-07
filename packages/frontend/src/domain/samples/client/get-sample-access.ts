import { baseBrowserApiUrl } from "#/api.ts";

export async function getSampleAccess(
  id: string,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const res = await fetchFn(new URL(`admin/samples/${id}`, baseBrowserApiUrl), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

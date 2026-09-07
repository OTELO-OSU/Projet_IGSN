import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";

export async function deleteServiceAccount(
  apiFetch: typeof fetch,
  id: string,
): Promise<void> {
  const res = await apiFetch(new URL(`admin/service-accounts/${id}`, API_URL), {
    method: "DELETE",
  });
  if (!res.ok) {
    throw HttpError.fromResponse(
      res,
      `Failed to delete the service account (${res.status})`,
    );
  }
}

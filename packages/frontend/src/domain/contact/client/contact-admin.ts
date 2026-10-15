import type { ContactAdminBody } from "@projet-igsn/domain/contact/contact-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export async function contactAdmin(
  body: ContactAdminBody,
  fetchFn: typeof fetch = apiFetch,
): Promise<"sent" | "rate_limited"> {
  const res = await fetchFn(new URL("contact", baseApiUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    return "rate_limited";
  }
  if (!res.ok) {
    throw new Error(`Failed to contact the administrators (${res.status})`);
  }
  return "sent";
}

import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export async function contactSampleOwner(
  igsn: string,
  body: ContactSampleOwnerBody,
  fetchFn: typeof fetch = apiFetch,
): Promise<"sent" | "no_recipient"> {
  const res = await fetchFn(new URL(`samples/${igsn}/contact`, baseApiUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 409) {
    return "no_recipient";
  }
  if (!res.ok) {
    throw new Error(`Failed to contact the sample owner (${res.status})`);
  }
  return "sent";
}

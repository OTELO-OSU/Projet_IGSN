import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export type ContactRecipient = "owner" | "archive";

const CONTACT_PATH: Record<ContactRecipient, string> = {
  owner: "contact",
  archive: "contact/archive",
};

export async function contactSampleOwner(
  igsn: string,
  recipient: ContactRecipient,
  body: ContactSampleOwnerBody,
  fetchFn: typeof fetch = apiFetch,
): Promise<"sent" | "no_recipient"> {
  const res = await fetchFn(
    new URL(`samples/${igsn}/${CONTACT_PATH[recipient]}`, baseApiUrl),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 409) {
    return "no_recipient";
  }
  if (!res.ok) {
    throw new Error(
      `Failed to contact the sample ${recipient} (${res.status})`,
    );
  }
  return "sent";
}

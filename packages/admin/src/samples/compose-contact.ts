import type { ContactLink } from "@projet-igsn/domain/sample/contact-link";

import { hasTypedContactName } from "@projet-igsn/domain/sample/contact-link";

type ContactCandidate = {
  userId: string | undefined;
  firstname: string | undefined;
  lastname: string | undefined;
  orcid: string | undefined;
};

export const isTypedContact = (contact: ContactLink): boolean =>
  contact.userId == null && hasTypedContactName(contact);

export function composeContact(
  userId: string | null | undefined,
  firstname: string | null | undefined,
  lastname: string | null | undefined,
  orcid?: string | null,
): ContactCandidate {
  const contact = {
    userId: userId || undefined,
    firstname: firstname?.trim() || undefined,
    lastname: lastname?.trim() || undefined,
    orcid: orcid?.trim() || undefined,
  };
  return isTypedContact(contact)
    ? { ...contact, userId: undefined }
    : {
        userId: contact.userId,
        firstname: undefined,
        lastname: undefined,
        orcid: undefined,
      };
}

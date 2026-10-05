import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { useMutation } from "@tanstack/react-query";

import {
  type ContactRecipient,
  contactSampleOwner,
} from "#/domain/samples/client/contact-sample-owner.ts";

export function useContactSampleOwner(
  igsn: string,
  recipient: ContactRecipient,
) {
  return useMutation({
    mutationFn: (body: ContactSampleOwnerBody) =>
      contactSampleOwner(igsn, recipient, body),
  });
}

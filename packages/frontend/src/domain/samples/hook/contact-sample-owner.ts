import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";

import { useMutation } from "@tanstack/react-query";

import { contactSampleOwner } from "#/domain/samples/client/contact-sample-owner.ts";

export function useContactSampleOwner(igsn: string) {
  return useMutation({
    mutationFn: (body: ContactSampleOwnerBody) =>
      contactSampleOwner(igsn, body),
  });
}

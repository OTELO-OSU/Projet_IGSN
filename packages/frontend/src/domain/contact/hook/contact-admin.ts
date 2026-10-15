import type { ContactAdminBody } from "@projet-igsn/domain/contact/contact-validator";

import { useMutation } from "@tanstack/react-query";

import { contactAdmin } from "#/domain/contact/client/contact-admin.ts";

export function useContactAdmin() {
  return useMutation({
    mutationFn: (body: ContactAdminBody) => contactAdmin(body),
  });
}

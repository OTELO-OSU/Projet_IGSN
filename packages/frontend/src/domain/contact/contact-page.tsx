import type { ContactAdminBody } from "@projet-igsn/domain/contact/contact-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useNavigate } from "@tanstack/react-router";

import { useContactAdmin } from "#/domain/contact/hook/contact-admin.ts";
import { ContactOwnerForm } from "#/domain/samples/contact-owner-form.tsx";
import { PageBanner } from "#/page-banner.tsx";
import { m } from "#/paraglide/messages.js";

export function ContactPage() {
  const { mutateAsync } = useContactAdmin();
  const navigate = useNavigate();

  const send = async (body: ContactAdminBody) => {
    const result = await mutateAsync(body);
    if (result === "sent") {
      toast.success(m.contact_admin_sent());
      await navigate({ to: "/" });
    }
    return result;
  };

  return (
    <>
      <PageBanner title={m.contact_admin_title()} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ContactOwnerForm
          withSubject
          title={m.contact_admin_title()}
          onSend={send}
        />
      </div>
    </>
  );
}

import type { ContactAdminBody } from "@projet-igsn/domain/contact/contact-validator";

import { describe, expect, it, vi } from "vitest";

import type { SendMail } from "../mail/send-mail.ts";

import { createContactRoutes } from "./routes.ts";

const FRONTEND_URL = "http://localhost:3000/";
const CONTACT_EMAIL = "contact@igsn.localhost";

const visitor: ContactAdminBody = {
  name: "Curieux",
  firstname: "Camille",
  email: "camille.curieux@example.org",
  subject: "Sample loan",
  message: "May I borrow a sample?\nFor a thin section.",
};

function arrangeApp({
  contactEmail = CONTACT_EMAIL,
  mailConfigured = true,
}: { contactEmail?: string; mailConfigured?: boolean } = {}) {
  const sendMail = vi.fn<SendMail>().mockResolvedValue(undefined);
  const app = createContactRoutes(
    mailConfigured ? { sendMail, frontendUrl: FRONTEND_URL } : undefined,
    contactEmail,
  );
  const contact = (body: unknown) =>
    app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return { sendMail, contact };
}

describe("POST /contact", () => {
  it("should mail the platform mailbox the visitor's quoted message, answering the visitor", async () => {
    const { sendMail, contact } = arrangeApp();

    const res = await contact(visitor);

    expect(res.status).toBe(204);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      to: [CONTACT_EMAIL],
      replyTo: visitor.email,
      subject: "Contact form: Sample loan",
      text: `Hello,

Camille Curieux (camille.curieux@example.org) sent this message through the contact form. Reply to this email to answer.

> May I borrow a sample?
> For a thin section.

Open the sample registry: ${FRONTEND_URL}
`,
      html: expect.any(String),
    });
  });

  it.each([
    ["a missing subject", { ...visitor, subject: undefined }],
    ["an invalid email", { ...visitor, email: "camille" }],
    ["a subject over 200 characters", { ...visitor, subject: "a".repeat(201) }],
    ["an unknown key", { ...visitor, igsn: "0123456789ABCDEFGHJKMNPQRS" }],
  ])("should reject %s without mailing", async (_, body) => {
    const { sendMail, contact } = arrangeApp();

    const res = await contact(body);

    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it.each([
    ["mail", { mailConfigured: false }],
    ["the platform mailbox", { contactEmail: "" }],
  ])("should answer 500 when %s is not configured", async (_, options) => {
    const { sendMail, contact } = arrangeApp(options);

    const res = await contact(visitor);

    expect(res.status).toBe(500);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

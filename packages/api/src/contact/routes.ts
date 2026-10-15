import { contactAdminBodySchema } from "@projet-igsn/domain/contact/contact-validator";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";

import type { SendMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";

const validateContactAdminBody = validator("json", (value, c) => {
  const parsed = contactAdminBodySchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "Invalid contact request" }, 400);
  }
  return parsed.data;
});

export function createContactRoutes(
  mail?: { sendMail: SendMail; frontendUrl: string },
  contactEmail?: string,
) {
  return new Hono().post("/", validateContactAdminBody, async (c) => {
    if (!mail || !contactEmail) {
      throw new HTTPException(500, { message: "Mail is not configured" });
    }
    const visitor = c.req.valid("json");
    await mail.sendMail({
      to: [contactEmail],
      replyTo: visitor.email,
      ...(await ctaMailFor("contact_admin", {
        recipient: { name: null, firstname: null },
        params: {
          subject: visitor.subject,
          visitor: fullName(visitor),
          email: visitor.email,
        },
        quote: visitor.message,
        url: mail.frontendUrl,
      })),
    });
    return c.body(null, 204);
  });
}

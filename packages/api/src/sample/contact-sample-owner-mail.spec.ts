import { describe, expect, it } from "vitest";

import { contactSampleOwnerMail } from "./contact-sample-owner-mail.ts";

const FRONTEND_URL = "http://localhost:3000";
const IGSN = "0123456789ABCDEFGHJKMNPQRS";

const contact = {
  visitor: {
    email: "camille.curieux@example.org",
    name: "Curieux",
    firstname: "Camille",
    message: "Where was this sample collected?\nCould I get a sub-sample?",
  },
  sampleName: "Basalt core 12",
  igsn: IGSN,
  frontendUrl: FRONTEND_URL,
};

describe("contactSampleOwnerMail", () => {
  it("should quote every line of the visitor's message under the intro, above the link", async () => {
    const mail = await contactSampleOwnerMail(contact);

    expect(mail.subject).toBe(
      'A visitor wants to contact you about the sample "Basalt core 12"',
    );
    expect(mail.text).toBe(
      `Hello,

Camille Curieux (camille.curieux@example.org) sent this message about the sample "Basalt core 12" (${IGSN}). Reply to this email to answer.

> Where was this sample collected?
> Could I get a sub-sample?

Open the sample: ${FRONTEND_URL}/samples/${IGSN}
`,
    );
  });

  it("should render the message as a quoted block in the html", async () => {
    const mail = await contactSampleOwnerMail(contact);

    expect(mail.html).toMatch(
      /<blockquote[^>]*>[\s\S]*Where was this sample collected\?[\s\S]*<\/blockquote>/,
    );
  });

  it("should escape html carried by the visitor's message", async () => {
    const mail = await contactSampleOwnerMail({
      ...contact,
      visitor: { ...contact.visitor, message: "<script>alert(1)</script>" },
    });

    expect(mail.html).not.toContain("<script>alert(1)</script>");
    expect(mail.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

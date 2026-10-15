import { test } from "@playwright/test";

import type { Visitor } from "../support/frontend/sample-contact.page";

import { contactPage } from "../support/frontend/contact.page";
import { maildev } from "../support/maildev";

const SUBJECT = "Declaring a meteorite";

const VISITOR: Visitor = {
  name: "Lovelace",
  firstname: "Ada",
  email: "ada.lovelace@example.org",
  message: "How do I declare a sample of a meteorite?",
};

test.describe("contact the administrators", () => {
  test("a visitor writes to the administrators from the footer", async ({
    page,
    request,
  }) => {
    const contact = contactPage(page);
    await contact.openFromFooter();

    await contact.send(SUBJECT, VISITOR);
    await contact.expectSent();

    await maildev(request).expectMail(
      "contact@igsn.localhost",
      `Contact form: ${SUBJECT}`,
      [VISITOR.message],
      VISITOR.email,
    );
  });
});

import { RESEARCHERS } from "../support/admin/sign-in";
import { test } from "../support/db";
import {
  sampleContactPage,
  type Visitor,
} from "../support/frontend/sample-contact.page";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";
import { maildev } from "../support/maildev";
import { frontendUrl } from "../support/urls";

const VISITOR: Visitor = {
  name: "Lovelace",
  firstname: "Ada",
  email: "ada.lovelace@example.org",
  message: "May I study a fragment of this sample in thin section?",
};

test.describe("contact the record owner", () => {
  test("a visitor emails the owner of a published sample", async ({
    page,
    request,
    samples,
  }) => {
    const sample = samples.find(
      (candidate) => candidate.published && candidate.owner === "jean",
    );
    if (!sample || sample.igsn === null) {
      throw new Error("seed must include a published sample owned by jean");
    }

    const detail = sampleDetailPage(page);
    await detail.goto(sample.igsn);
    await detail.expectDeclaredBy("Jean Martin");
    await detail.expectNoHorizontalOverflow();

    await detail.openContactForm();
    const contact = sampleContactPage(page);
    await contact.expectVisible();

    await contact.send(VISITOR);
    await detail.expectContactSent();

    await maildev(request).expectMail(
      RESEARCHERS.jean.email,
      `A visitor wants to contact you about the sample "${sample.name}"`,
      [VISITOR.message, `${frontendUrl}/samples/${sample.igsn}`],
      VISITOR.email,
    );
  });
});

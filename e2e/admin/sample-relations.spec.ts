import path from "node:path";

import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

const RELATION = {
  relationType: "References",
  identifierType: "DOI",
  identifier: "https://doi.org/10.1594/IEDA.100252",
  title: "Companion dataset",
  resourceType: "Dataset",
  description: "Measurements published alongside this sample.",
};

const ATTACHMENT_RESOURCE = {
  title: "Analysis report",
  resourceType: "Report",
};

const PNG_RESOURCE = { title: "Outcrop photograph", resourceType: "Image" };

const TXT_RESOURCE = { title: "Field notes", resourceType: "Text" };

test.describe("sample relations", () => {
  test("a researcher adds a relation and attaches files", async ({
    page,
    samples,
  }) => {
    const draft = samples.find(
      (sample) => sample.status === "draft" && sample.owner === "pierre",
    );
    if (!draft) throw new Error("seed must include a draft sample for pierre");

    await signInAsResearcher(page, RESEARCHERS.pierre);
    const list = sampleListPage(page);
    await list.openSample(draft.name);

    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.openRelatedResourcesTab();

    await edit.addRelation(1, RELATION);
    await edit.uploadAttachments([
      fixture("fichierTest.pdf"),
      fixture("test.png"),
      fixture("test.txt"),
    ]);
    await edit.setAttachmentResource("fichierTest.pdf", ATTACHMENT_RESOURCE);
    await edit.setAttachmentResource("test.png", PNG_RESOURCE);
    await edit.setAttachmentResource("test.txt", TXT_RESOURCE);
    await edit.save();
    await edit.confirmUploads();

    await page.reload();
    await edit.openRelatedResourcesTab();
    await edit.expectRelation(1, RELATION);
    await edit.expectAttachment("fichierTest.pdf", ATTACHMENT_RESOURCE);
    await edit.expectAttachment("test.png", PNG_RESOURCE);
    await edit.expectAttachment("test.txt", TXT_RESOURCE);
  });
});

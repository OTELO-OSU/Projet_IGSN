import path from "node:path";

import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { expect, test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

const RELATION = {
  relationType: "Is cited by",
  identifierType: "DOI",
  identifier: "https://doi.org/10.5880/GFZ.2026.001",
  title: "Field measurements dataset",
  description: "Measurements collected during the same campaign.",
};

const ATTACHMENT_RESOURCE = {
  title: "Field notes",
  resourceType: "Dataset",
};

test.describe("sample relations on the public page", () => {
  test("a reader sees an editor's relation and downloads the file", async ({
    page,
    samples,
  }) => {
    const published = samples.find((sample) => sample.status === "published");
    if (!published || published.igsn === null) {
      throw new Error("seed must include a published sample with an igsn");
    }

    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.openSample(published.name);
    const edit = sampleEditPage(page);
    await edit.openRelatedResourcesTab();
    await edit.addRelation(1, RELATION);
    await edit.uploadAttachments([fixture("test.txt")]);
    await edit.setAttachmentResource("test.txt", ATTACHMENT_RESOURCE);
    await edit.publishUpdates();
    await edit.confirmUploads();
    await edit.expectAttachment("test.txt", ATTACHMENT_RESOURCE);

    const detail = sampleDetailPage(page);
    await detail.goto(published.igsn);
    await detail.expectRelation(RELATION.title, RELATION.identifier);
    await detail.expectAttachment(ATTACHMENT_RESOURCE.title);

    const href = await detail.attachmentDownloadHref("test.txt");
    expect(href).not.toBeNull();
    const download = await page.request.get(href!);
    expect(download.status()).toBe(200);
    expect(await download.text()).toContain("Lorem ipsum dolor sit amet");
  });
});

import path from "node:path";

import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { expect, test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

test.describe("sample links on the public page", () => {
  test("a reader sees an editor's links and downloads the file", async ({
    page,
    samples,
  }) => {
    const published = samples.find((sample) => sample.published);
    if (!published || published.igsn === null) {
      throw new Error("seed must include a published sample with an igsn");
    }

    // Arrange through the admin: an editor adds a DOI link and a file to the
    // published sample.
    await signInAsResearcher(page, RESEARCHERS.jean);
    const list = sampleListPage(page);
    await list.openSample(published.name);
    const edit = sampleEditPage(page);
    await edit.openLinksTab();
    await edit.addLink(
      1,
      "https://doi.org/10.5880/GFZ.2026.001",
      "Field measurements dataset",
    );
    await edit.publishUpdates();
    await edit.uploadAttachments([fixture("test.txt")]);
    await edit.expectAttachment("test.txt");

    // The reader finds them on the public detail page.
    const detail = sampleDetailPage(page);
    await detail.goto(published.igsn);
    await detail.expectDoiLink(
      "https://doi.org/10.5880/GFZ.2026.001",
      "Field measurements dataset",
    );
    await detail.expectAttachment("test.txt");

    // The download button serves the uploaded content, unauthenticated.
    const href = await detail.attachmentDownloadHref("test.txt");
    expect(href).not.toBeNull();
    const download = await page.request.get(href!);
    expect(download.status()).toBe(200);
    expect(await download.text()).toContain("Lorem ipsum dolor sit amet");
  });
});

import path from "node:path";

import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

test.describe("sample links", () => {
  test("a researcher adds a DOI link and attaches files", async ({
    page,
    samples,
  }) => {
    const draft = samples.find(
      (sample) => !sample.published && sample.owner === "pierre",
    );
    if (!draft) throw new Error("seed must include a draft sample for pierre");

    await signInAsResearcher(page, RESEARCHERS.pierre);
    const list = sampleListPage(page);
    await list.openSample(draft.name);

    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.openLinksTab();

    await edit.addLink(
      1,
      "https://doi.org/10.1594/IEDA.100252",
      "Companion dataset",
    );
    await edit.uploadAttachments([
      fixture("fichierTest.pdf"),
      fixture("test.png"),
      fixture("test.txt"),
    ]);
    await edit.expectAttachment("fichierTest.pdf");
    await edit.expectAttachment("test.png");
    await edit.expectAttachment("test.txt");
    await edit.saveDraft();
    await edit.confirmUploads();

    await page.reload();
    await edit.openLinksTab();
    await edit.expectLink(
      1,
      "https://doi.org/10.1594/IEDA.100252",
      "Companion dataset",
    );
    await edit.expectAttachment("fichierTest.pdf");
    await edit.expectAttachment("test.png");
    await edit.expectAttachment("test.txt");
  });
});

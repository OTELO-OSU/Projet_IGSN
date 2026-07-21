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
    const draft = samples.find((sample) => !sample.published);
    if (!draft) throw new Error("seed must include a draft sample");

    await signInAsResearcher(page, RESEARCHERS.pierre);
    const list = sampleListPage(page);
    await list.openSample(draft.name);

    const edit = sampleEditPage(page);
    await edit.expectVisible();
    await edit.openLinksTab();

    // The DOI link rides the sample document.
    await edit.addLink(
      1,
      "https://doi.org/10.1594/IEDA.100252",
      "Companion dataset",
    );
    await edit.saveDraft();

    // Several files at once through the drop zone's input.
    await edit.uploadAttachments([
      fixture("fichierTest.pdf"),
      fixture("test.png"),
      fixture("test.txt"),
    ]);
    await edit.expectAttachment("fichierTest.pdf");
    await edit.expectAttachment("test.png");
    await edit.expectAttachment("test.txt");

    // Everything survives a full reload: link and files come back from the API.
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

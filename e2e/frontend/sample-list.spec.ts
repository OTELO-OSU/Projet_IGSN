import { expect, sampleNamed, test } from "../support/db";
import { sampleListPage } from "../support/frontend/sample-list.page";

test.describe("sample list", () => {
  test("a reader can search for a sample by name and add a field to the result cards", async ({
    page,
    samples,
  }) => {
    const target = sampleNamed(samples, "Basalt 42");

    const list = sampleListPage(page);
    await list.goto();
    await list.search(target.name);

    await list.expectSampleLink(target.name, target.igsn);

    await list.pickCardField("Collection method");
    await list.expectCardLine("Collection method", "Blasting");

    await page.reload();

    await list.expectCardLine("Collection method", "Blasting");
  });

  test("a quoted phrase finds a sample only when its words are side by side, in order", async ({
    page,
    samples,
  }) => {
    const target = sampleNamed(samples, "Basalt 42");

    const list = sampleListPage(page);
    await list.goto();
    await list.search('"42 basalt"');

    await list.expectNoResults();

    await list.search('"basalt 42"');

    await list.expectSampleLink(target.name, target.igsn);
  });

  test.describe("on a desktop", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("a reader keeps the table view and downloads only the checked samples as Excel", async ({
      page,
      samples,
    }, testInfo) => {
      const vesuvius = sampleNamed(samples, "Vesuvius Ash");
      const etna = sampleNamed(samples, "Etna Ash");

      const list = sampleListPage(page);
      await list.gotoWithSearch("material=rock_and_sediment.sediment");
      await list.switchToTableView();

      await page.reload();

      await list.expectTableView();
      await list.checkSample(vesuvius.name);
      await list.pickPageSize("25");
      await list.checkSample(etna.name);

      expect(
        new Set(await list.downloadCheckedIgsns("Excel", testInfo)),
      ).toEqual(new Set([vesuvius.igsn, etna.igsn]));
    });
  });
});

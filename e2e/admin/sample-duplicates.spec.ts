import type { Page } from "@playwright/test";

import { sampleCreatePage } from "../support/admin/sample-create.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { signInAsResearcher } from "../support/admin/sign-in";
import { expect, sampleNamed, test } from "../support/db";

const BASALT_MATERIAL = ["Rock", "Igneous", "Volcanic", "Mafic", "Basalt"];

const SAME_COLLECTOR = { firstname: "Claire", lastname: "Martin" };
const OTHER_COLLECTOR = { firstname: "Marie", lastname: "Curie" };

async function declareBasaltDraft(
  page: Page,
  name: string,
  collector: { firstname: string; lastname: string },
) {
  await sampleListPage(page).goToCreate();
  const create = sampleCreatePage(page);
  await create.expectVisible();
  await create.fillName(name);
  await create.selectNature("Thin section");
  await create.fillPublishableFields({ material: BASALT_MATERIAL });
  await create.openTab("Scientific context");
  await create.fillPersonName(
    /^Collector name/,
    collector.firstname,
    collector.lastname,
  );
  await create.submit();
  await sampleEditPage(page).expectVisible();
}

test.describe("duplicate samples", () => {
  test("a contributor cancels the publication of a suspected duplicate", async ({
    page,
    world,
  }) => {
    const { samples } = world;
    const published = sampleNamed(samples, "Basalt 42");

    await signInAsResearcher(page, world.researchers.pierre);
    await declareBasaltDraft(page, published.name, SAME_COLLECTOR);

    const edit = sampleEditPage(page);
    await edit.openPublish();
    await edit.expectDuplicateWarning([published]);
    await edit.cancelDuplicateWarning();
    await edit.expectNoPublicPage();

    await edit.goToList();
    const list = sampleListPage(page);
    await list.expectVisible();
    await list.expectSampleRowWithStatus(published.name, "Draft");
  });

  test("a contributor confirms the publication of a suspected duplicate", async ({
    page,
    world,
  }) => {
    const { samples } = world;
    const published = sampleNamed(samples, "Basalt 42");

    await signInAsResearcher(page, world.researchers.pierre);
    await declareBasaltDraft(page, published.name, SAME_COLLECTOR);

    const edit = sampleEditPage(page);
    await edit.openPublish();
    await edit.expectDuplicateWarning([published]);
    await edit.confirmDuplicateWarning();

    const list = sampleListPage(page);
    await list.expectVisible();
    await list.expectSampleRowWithStatus(published.name, "Published");

    await list.openSample(published.name);
    expect(await edit.publicPageIgsn()).not.toBe(published.igsn);
  });

  test("a contributor publishes a sample collected by someone else without a warning", async ({
    page,
    world,
  }) => {
    const { samples } = world;
    const published = sampleNamed(samples, "Basalt 42");

    await signInAsResearcher(page, world.researchers.pierre);
    await declareBasaltDraft(page, published.name, OTHER_COLLECTOR);

    const edit = sampleEditPage(page);
    await edit.publish();

    const list = sampleListPage(page);
    await list.expectVisible();
    await list.expectSampleRowWithStatus(published.name, "Published");
  });
});

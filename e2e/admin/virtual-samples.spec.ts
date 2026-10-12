import { sampleCreatePage } from "../support/admin/sample-create.page";
import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";
import { sampleDetailPage } from "../support/frontend/sample-detail.page";

test.describe("virtual samples", () => {
  test("a researcher publishes a series of two cores, a third core joins it, and the public pages link them both ways", async ({
    page,
  }) => {
    test.slow();
    await signInAsResearcher(page, RESEARCHERS.pierre);
    const list = sampleListPage(page);
    const create = sampleCreatePage(page);
    const edit = sampleEditPage(page);

    const fillNewSample = async (name: string, type: string | string[]) => {
      await list.goToCreate();
      await create.expectVisible();
      await create.fillName(name);
      await create.fillPublishableFields({ type });
    };
    const openPublished = async (name: string) => {
      await list.expectVisible();
      await list.openSample(name);
      await edit.expectVisible();
      const igsn = await edit.publicPageIgsn();
      await edit.goToList();
      return { name, igsn };
    };

    const publishCore = async (name: string) => {
      await fillNewSample(name, ["Core", "Core Piece"]);
      await create.publish();
      return openPublished(name);
    };

    const stamp = Date.now();
    const first = await publishCore(`Series core one ${stamp}`);
    const second = await publishCore(`Series core two ${stamp}`);
    const third = await publishCore(`Series core three ${stamp}`);
    const children = [first, second];

    const seriesName = `Core series ${stamp}`;
    await fillNewSample(seriesName, ["Series of samples", "Core"]);
    await create.publish();
    await list.expectVisible();
    await list.openSample(seriesName);
    await edit.expectVisible();
    await edit.openTab("Identity");
    for (const child of children) await edit.attachChild(child);
    await edit.save();
    const series = { name: seriesName, igsn: await edit.publicPageIgsn() };

    await edit.goToList();
    await list.expectVisible();
    await list.openSample(third.name);
    await edit.expectVisible();
    await edit.openTab("Identity");
    await edit.pickSeries(series);
    await edit.save();

    const detail = sampleDetailPage(page);
    await detail.goto(series.igsn);
    for (const child of [...children, third])
      await detail.expectChild(child.name, child.igsn);

    for (const member of [first, third]) {
      await detail.goto(member.igsn);
      await detail.expectParent(series.name, series.igsn);
    }
  });
});

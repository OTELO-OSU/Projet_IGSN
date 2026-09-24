import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { shareSamplePage } from "../support/admin/share-sample.page";
import { signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";
import { maildev } from "../support/maildev";

test.describe("share a sample", () => {
  test("a researcher shares a draft with a colleague", async ({
    page,
    request,
    world,
  }) => {
    const { camille, jean } = world.researchers;
    const { samples } = world;
    const draft = samples.find(
      (sample) => sample.status === "draft" && sample.owner === "camille",
    );
    if (!draft) throw new Error("seed must include a draft sample for camille");

    await signInAsResearcher(page, camille);
    const list = sampleListPage(page);
    await list.openSample(draft.name);
    const edit = sampleEditPage(page);
    await edit.expectVisible();

    const share = shareSamplePage(page);
    await share.open();
    await share.expectOwner("Camille Petit", camille.email);
    await share.expectNoCollaborator(jean.email);

    await share.openPicker();
    await share.searchColleague(jean.email);
    await share.expectColleagueOffered(jean.email);
    await share.pickColleague(jean.email);
    await share.chooseRole("Editor");
    await share.invite();

    await share.expectCollaborator(jean.email);
    await share.expectCollaboratorRole(jean.email, "Editor");

    await share.close();
    await edit.expectVisible();
    await share.open();
    await share.expectCollaborator(jean.email);

    await share.removeCollaborator("Jean Martin");
    await share.expectNoCollaborator(jean.email);

    await maildev(request).expectMail(
      jean.email,
      `Camille Petit removed you from the sample "${draft.name}"`,
      [draft.name],
    );
  });
});

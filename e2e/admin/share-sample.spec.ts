import { sampleEditPage } from "../support/admin/sample-edit.page";
import { sampleListPage } from "../support/admin/sample-list.page";
import { shareSamplePage } from "../support/admin/share-sample.page";
import { RESEARCHERS, signInAsResearcher } from "../support/admin/sign-in";
import { test } from "../support/db";

const COLLEAGUE = "jean.martin@univ-lorraine.fr";

test.describe("share a sample", () => {
  test("a researcher shares a draft with a colleague", async ({
    page,
    samples,
  }) => {
    const draft = samples.find(
      (sample) => !sample.published && sample.owner === "camille",
    );
    if (!draft) throw new Error("seed must include a draft sample for camille");

    await signInAsResearcher(page, RESEARCHERS.camille);
    const list = sampleListPage(page);
    await list.openSample(draft.name);
    const edit = sampleEditPage(page);
    await edit.expectVisible();

    const share = shareSamplePage(page);
    await share.open();
    await share.expectOwner("Camille Petit", RESEARCHERS.camille.email);
    await share.expectNoCollaborator(COLLEAGUE);

    await share.openPicker();
    await share.expectColleagueOffered("Martin");
    await share.pickColleague("Martin");
    await share.chooseRole("Editor");
    await share.invite();

    await share.expectCollaborator(COLLEAGUE);
    await share.expectCollaboratorRole(COLLEAGUE, "Editor");

    await share.close();
    // The add must not bounce the owner back to the list (a 401 from the
    // live-session guard would); the dialog reopens on the saved collaborator.
    await edit.expectVisible();
    await share.open();
    await share.expectCollaborator(COLLEAGUE);

    await share.removeCollaborator("Jean Martin");
    await share.expectNoCollaborator(COLLEAGUE);
  });
});

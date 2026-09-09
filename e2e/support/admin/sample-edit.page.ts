import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";
import { chooseOption } from "./choose-option.ts";
import { expectNoManualGroupOffered } from "./manual-groups-field.ts";
import { sampleFormPage } from "./sample-form.page.ts";

type SaveMenuAction = "Withdraw" | "Tombstone";

type RelationFields = {
  relationType: string;
  identifierType: string;
  identifier: string;
  title: string;
  resourceType: string;
  description: string;
};

type AttachmentResource = {
  title: string;
  resourceType: string;
};

export function sampleEditPage(page: Page) {
  const form = sampleFormPage(page);
  const { openTab, pick, confirm, confirmStatusChange } = form;

  const relationBlock = (index: number, type: string) =>
    page.getByRole("group", {
      name: `${index}. ${type} Relation`,
      exact: true,
    });

  const attachmentRow = (name: string) =>
    page.getByRole("listitem").filter({ hasText: name });

  const uploadDialog = page.getByRole("dialog", { name: "Uploading files" });
  const savedToast = page.getByText("Sample saved");
  // ponytail: under load the first save click is sometimes swallowed, so retry until the save is under way
  const clickSave = () =>
    expect(async () => {
      if (await uploadDialog.or(savedToast).first().isVisible()) return;
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(uploadDialog.or(savedToast).first()).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 30_000 });

  const openActionsMenu = () =>
    page.getByRole("button", { name: "More actions" }).click();

  const deleteButton = page.getByRole("button", {
    name: "Delete this draft",
    exact: true,
  });
  const deleteDialog = page.getByRole("dialog", { name: "Delete this draft?" });
  const confirmButton = deleteDialog.getByRole("button", {
    name: "Delete",
    exact: true,
  });
  const openDialogAndType = async (phrase: string) => {
    await deleteButton.click();
    await deleteDialog.getByLabel("Type DELETE to confirm").fill(phrase);
  };

  const requestDeletionButton = page.getByRole("button", {
    name: "Request deletion",
    exact: true,
  });
  const requestDeletionDialog = page.getByRole("dialog", {
    name: "Request the deletion of this sample",
  });

  return {
    ...form,
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "Edit sample" })).toBeVisible(),
    goto: (sampleId: string) => page.goto(`${adminUrl}/samples/${sampleId}`),
    expectForbidden: () =>
      expect(
        page.getByText("You do not have access to this sample."),
      ).toBeVisible(),
    expectName: (name: string) =>
      expect(page.getByLabel(/name/i)).toHaveValue(name),
    fillSpecificName: async (value: string) => {
      await openTab("Sample classification");
      await page.getByLabel("Specific Name").fill(value);
    },
    goToList: () => page.getByRole("link", { name: "IGSN Admin" }).click(),
    expectAddSubSampleAction: (name: string) =>
      expect(
        page.getByRole("link", { name: `Add a sub sample of ${name}` }),
      ).toBeVisible(),

    expectNotFound: () =>
      expect(page.getByText("Sample not found")).toBeVisible(),
    deleteDraft: async () => {
      await openDialogAndType("DELETE");
      await confirmButton.click();
    },
    expectDeleteRefused: async () => {
      await openDialogAndType("delete");
      await expect(confirmButton).toBeDisabled();
      await deleteDialog.getByRole("button", { name: "Cancel" }).click();
      await expect(deleteDialog).toBeHidden();
    },
    expectNoDeleteAction: () => expect(deleteButton).toHaveCount(0),

    requestDeletion: async (reason: string) => {
      await requestDeletionButton.click();
      await requestDeletionDialog
        .getByLabel("Why do you want to delete this sample?")
        .fill(reason);
      await requestDeletionDialog
        .getByRole("button", { name: "Submit request" })
        .click();
      await expect(requestDeletionDialog).toBeHidden();
    },
    expectDeletionRequestSent: () =>
      expect(
        page.getByText(
          "Your request was sent to the super admin and is being processed.",
        ),
      ).toBeVisible(),
    expectDeletionRequestRefused: async () => {
      await requestDeletionButton.click();
      await requestDeletionDialog
        .getByRole("button", { name: "Submit request" })
        .click();
      await expect(
        requestDeletionDialog.getByText(
          "Explain why this sample should be deleted.",
        ),
      ).toBeVisible();
      await requestDeletionDialog
        .getByRole("button", { name: "Cancel" })
        .click();
      await expect(requestDeletionDialog).toBeHidden();
    },

    expectNoManualGroupOffered: () => expectNoManualGroupOffered(page),
    expectManualGroupFrozen: (name: string) =>
      expect(
        page.getByRole("button", { name: `Detach ${name}` }),
      ).toBeDisabled(),
    sampleId: () => {
      const id = new URL(page.url()).pathname.split("/").at(-1);
      if (!id) throw new Error("the edit page url carries no sample id");
      return id;
    },
    publicPageIgsn: async () => {
      const href = await page
        .getByRole("link", { name: "View public page" })
        .getAttribute("href");
      const igsn = href?.split("/").at(-1);
      if (!igsn) throw new Error("the published sample has no public page");
      return igsn;
    },

    saveAnd: async (action: SaveMenuAction) => {
      await openActionsMenu();
      await page.getByRole("menuitem", { name: action, exact: true }).click();
      await confirm(`${action} sample`);
    },
    expectSaveMenuItem: async (action: SaveMenuAction) => {
      await openActionsMenu();
      await expect(
        page.getByRole("menuitem", { name: action, exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    },
    restoreAsWithdrawn: async () => {
      await openActionsMenu();
      await page
        .getByRole("menuitem", { name: "Restore as withdrawn", exact: true })
        .click();
      await confirm("Restore sample as withdrawn");
    },
    republish: () => confirmStatusChange("Republish", "Republish sample"),
    expectStatusAction: (name: string) =>
      expect(page.getByRole("button", { name })).toBeVisible(),
    expectWithdrawnHint: () =>
      expect(
        page.getByText("This sample is withdrawn from public view."),
      ).toBeVisible(),

    openRelatedResourcesTab: () => openTab("Related URL or document"),
    addRelation: async (index: number, relation: RelationFields) => {
      await page.getByRole("button", { name: "Add a relation" }).click();
      await page
        .getByRole("menuitem", { name: relation.identifierType, exact: true })
        .click();
      const block = relationBlock(index, relation.identifierType);
      await pick("Relation type", relation.relationType, block);
      await block
        .getByRole("textbox", { name: "Identifier" })
        .fill(relation.identifier);
      await block.getByLabel(/^Title/).fill(relation.title);
      await chooseOption(page, block)("Resource type", relation.resourceType);
      await block.getByLabel("Description").fill(relation.description);
    },
    expectRelation: async (index: number, relation: RelationFields) => {
      const block = relationBlock(index, relation.identifierType);
      await expect(
        block.getByRole("combobox", { name: "Relation type" }),
      ).toHaveText(relation.relationType);
      await expect(
        block.getByRole("textbox", { name: "Identifier" }),
      ).toHaveValue(relation.identifier);
      await expect(block.getByLabel(/^Title/)).toHaveValue(relation.title);
      await expect(
        block.getByRole("combobox", { name: /^Resource type/ }),
      ).toHaveText(relation.resourceType);
      await expect(block.getByLabel("Description")).toHaveValue(
        relation.description,
      );
    },
    uploadAttachments: (paths: string[]) =>
      page.getByLabel("Browse files").setInputFiles(paths),
    setAttachmentResource: async (
      name: string,
      resource: AttachmentResource,
    ) => {
      const row = attachmentRow(name);
      await row.getByLabel(/^Title/).fill(resource.title);
      await chooseOption(page, row)("Resource type", resource.resourceType);
    },
    expectAttachment: async (name: string, resource: AttachmentResource) => {
      await expect(page.getByLabel(`Description of ${name}`)).toBeVisible();
      const row = attachmentRow(name);
      await expect(row.getByLabel(/^Title/)).toHaveValue(resource.title);
      await expect(
        row.getByRole("combobox", { name: /^Resource type/ }),
      ).toHaveText(resource.resourceType);
    },
    confirmUploads: async () => {
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(uploadDialog).toBeHidden();
    },

    save: async () => {
      await clickSave();
      await expect(savedToast).toBeVisible();
    },
  };
}

import { expect, type Locator, type Page } from "@playwright/test";

import { adminUrl } from "../urls";
import { chooseOption } from "./choose-option.ts";
import { expectNoManualGroupOffered } from "./manual-groups-field.ts";

type SaveMenuAction = "Withdraw" | "Tombstone";

type RelationFields = {
  relationType: string;
  identifierType: string;
  identifier: string;
  title: string;
  description: string;
};

type AttachmentResource = {
  title: string;
  resourceType: string;
};

export function sampleEditPage(page: Page) {
  const openTab = (name: string) => page.getByRole("tab", { name }).click();
  const pick = async (
    field: string,
    label: string,
    scope: Locator | Page = page,
  ) => {
    const combobox = scope.getByRole("combobox", {
      name: new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
    });
    await expect(async () => {
      if ((await combobox.innerText()).trim() !== label) {
        await combobox.click();
        await page.getByRole("option", { name: label, exact: true }).click();
      }
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await expect(combobox).toHaveText(label, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  };

  const relationBlock = (index: number) =>
    page.getByRole("group", { name: `Relation ${index}`, exact: true });

  const attachmentRow = (name: string) =>
    page.getByRole("listitem").filter({ hasText: name });

  const uploadDialog = page.getByRole("dialog", { name: "Uploading files" });
  const savedToast = page.getByText("Sample saved");
  // ponytail: under load the first save click is sometimes swallowed, so retry until the save is under way
  const clickSave = (name: string) =>
    expect(async () => {
      if (await uploadDialog.or(savedToast).first().isVisible()) return;
      await page.getByRole("button", { name }).click();
      await expect(uploadDialog.or(savedToast).first()).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 30_000 });

  const confirm = (dialog: string) =>
    page
      .getByRole("dialog", { name: dialog })
      .getByRole("button", { name: "Confirm" })
      .click();
  const confirmStatusChange = async (action: string, dialog: string) => {
    await page.getByRole("button", { name: action }).click();
    await confirm(dialog);
  };

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
    publicPageIgsn: async () => {
      const href = await page
        .getByRole("link", { name: "View public page" })
        .getAttribute("href");
      const igsn = href?.split("/").at(-1);
      if (!igsn) throw new Error("the published sample has no public page");
      return igsn;
    },

    fillPublishableFields: async () => {
      await pick("Type", "Dredge");
      await pick("Provenance status", "Collection specimen");
      await page
        .getByRole("group", { name: /collection date/i })
        .getByRole("textbox", { name: /^Date/ })
        .fill("2025-06-15");
      await openTab("Sample classification");
      await pick("Material", "Synthetic rock / mineral");
      await openTab("Scientific context");
      await page.getByLabel(/collection curator/i).fill("Paul Bernard");
      await pick("Collection origin", "Scientific expedition");
      await openTab("Curation and repository");
      await pick("Existence status", "Exists");
      await pick("Availability status", "Available");
      await pick(
        "Current archive",
        "Centre National de la Recherche Scientifique (CNRS)",
      );
      await openTab("Sample classification");
      await pick("Starting material", "Natural");
      await pick("Nature of starting material", "Powder");
      await pick("Final product", "Glass");
      await page.getByRole("switch", { name: "Duration not relevant" }).click();
      await page
        .getByRole("group", { name: /synthesis date/i })
        .getByRole("textbox", { name: /^Date/ })
        .fill("2025-06-15");
      await page.getByLabel(/operator name/i).fill("Paul Bernard");
    },
    publish: () => confirmStatusChange("Save & Publish", "Publish sample"),
    publishAsWithdrawn: async () => {
      await page
        .getByRole("button", { name: "More publishing options" })
        .click();
      await page
        .getByRole("menuitem", { name: "Publish as withdrawn" })
        .click();
      await confirm("Publish sample as withdrawn");
    },

    saveAnd: async (action: SaveMenuAction) => {
      await openActionsMenu();
      await page.getByRole("menuitem", { name: `Save & ${action}` }).click();
      await confirm(`${action} sample`);
    },
    expectSaveMenuItem: async (action: SaveMenuAction) => {
      await openActionsMenu();
      await expect(
        page.getByRole("menuitem", { name: `Save & ${action}` }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    },
    restoreAsWithdrawn: () =>
      confirmStatusChange(
        "Restore as withdrawn",
        "Restore sample as withdrawn",
      ),
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
      const block = relationBlock(index);
      await pick("Relation type", relation.relationType, block);
      await pick("Identifier type", relation.identifierType, block);
      await block
        .getByRole("textbox", { name: "Identifier" })
        .fill(relation.identifier);
      await block.getByLabel("Title").fill(relation.title);
      await block.getByLabel("Description").fill(relation.description);
    },
    expectRelation: async (index: number, relation: RelationFields) => {
      const block = relationBlock(index);
      await expect(
        block.getByRole("combobox", { name: "Relation type" }),
      ).toHaveText(relation.relationType);
      await expect(
        block.getByRole("combobox", { name: "Identifier type" }),
      ).toHaveText(relation.identifierType);
      await expect(
        block.getByRole("textbox", { name: "Identifier" }),
      ).toHaveValue(relation.identifier);
      await expect(block.getByLabel("Title")).toHaveValue(relation.title);
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
      await row.getByLabel("Title", { exact: true }).fill(resource.title);
      await chooseOption(page, row)("Resource type", resource.resourceType);
    },
    expectAttachment: async (name: string, resource?: AttachmentResource) => {
      await expect(page.getByLabel(`Description of ${name}`)).toBeVisible();
      if (!resource) return;
      const row = attachmentRow(name);
      await expect(row.getByLabel("Title", { exact: true })).toHaveValue(
        resource.title,
      );
      await expect(
        row.getByRole("combobox", { name: "Resource type" }),
      ).toHaveText(resource.resourceType);
    },
    confirmUploads: async () => {
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(uploadDialog).toBeHidden();
    },

    saveDraft: async () => {
      await clickSave("Save as draft");
      await expect(savedToast).toBeVisible();
    },
    publishUpdates: async () => {
      await clickSave("Publish updates");
      await expect(savedToast).toBeVisible();
    },
  };
}

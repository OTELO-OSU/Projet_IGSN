import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";
import { expectNoManualGroupOffered } from "./manual-groups-field.ts";

type SaveMenuAction = "Withdraw" | "Tombstone";

export function sampleEditPage(page: Page) {
  const openTab = (name: string) => page.getByRole("tab", { name }).click();
  const pick = async (field: string, label: string) => {
    const combobox = page.getByRole("combobox", { name: field });
    await expect(async () => {
      if ((await combobox.innerText()).trim() !== label) {
        await combobox.click();
        await page.getByRole("option", { name: label, exact: true }).click();
      }
      await expect(combobox).toHaveText(label, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  };

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
      await openTab("Sample type");
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
      await openTab("Sample type");
      await pick("Material", "Synthetic rock / mineral");
      await openTab("Physical description");
      await page
        .getByRole("group", { name: /collection date/i })
        .getByRole("textbox", { name: /^Date/ })
        .fill("2025-06-15");
      await pick("Availability", "Exists");
      await openTab("Scientific context");
      await pick("Provenance status", "Collection / historical specimen");
      await page.getByLabel(/collection curator/i).fill("Paul Bernard");
      await pick("Collection origin", "Scientific expedition");
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

    openLinksTab: () => openTab("Links"),
    addLink: async (index: number, url: string, description: string) => {
      await page.getByRole("button", { name: "Add a link" }).click();
      await page.getByLabel(`DOI URL ${index}`).fill(url);
      await page.getByLabel(`Description ${index}`).fill(description);
    },
    expectLink: async (index: number, url: string, description: string) => {
      await expect(page.getByLabel(`DOI URL ${index}`)).toHaveValue(url);
      await expect(page.getByLabel(`Description ${index}`)).toHaveValue(
        description,
      );
    },
    uploadAttachments: (paths: string[]) =>
      page.getByLabel("Browse files").setInputFiles(paths),
    expectAttachment: (name: string) =>
      expect(page.getByLabel(`Description of ${name}`)).toBeVisible(),
    confirmUploads: async () => {
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(
        page.getByRole("dialog", { name: "Uploading files" }),
      ).toBeHidden();
    },

    saveDraft: async () => {
      await page.getByRole("button", { name: "Save as draft" }).click();
      await expect(page.getByText("Sample saved")).toBeVisible();
    },
    publishUpdates: async () => {
      await page.getByRole("button", { name: "Publish updates" }).click();
      await expect(page.getByText("Sample saved")).toBeVisible();
    },
  };
}

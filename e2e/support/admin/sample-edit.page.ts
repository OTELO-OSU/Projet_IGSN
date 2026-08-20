import { expect, type Page } from "@playwright/test";

import { adminUrl } from "../urls";
import { expectNoManualGroupOffered } from "./manual-groups-field.ts";

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
    goToList: () => page.getByRole("link", { name: "IGSN Admin" }).click(),

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
    publish: async () => {
      await page.getByRole("button", { name: "Save & Publish" }).click();
      await page
        .getByRole("dialog", { name: "Publish sample" })
        .getByRole("button", { name: "Confirm" })
        .click();
    },

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

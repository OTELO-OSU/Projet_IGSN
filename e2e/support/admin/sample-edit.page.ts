import { expect, type Page } from "@playwright/test";

export function sampleEditPage(page: Page) {
  return {
    expectVisible: () =>
      expect(page.getByRole("heading", { name: "Edit sample" })).toBeVisible(),
    expectName: (name: string) =>
      expect(page.getByLabel(/name/i)).toHaveValue(name),
    goToList: () => page.getByRole("link", { name: "IGSN Admin" }).click(),

    openLinksTab: () => page.getByRole("tab", { name: "Links" }).click(),
    // Adds a row then fills it; `index` is the 1-based row the labels carry.
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
    // The labelled (visually hidden) file input behind the Browse button;
    // several paths at once exercise the multi-file upload.
    uploadAttachments: (paths: string[]) =>
      page.getByLabel("Browse files").setInputFiles(paths),
    // The description field only exists on a SAVED attachment row, so this
    // waits out the upload: the bare file name would also match the transient
    // uploading row and let the journey race ahead of the POST.
    expectAttachment: (name: string) =>
      expect(page.getByLabel(`Description of ${name}`)).toBeVisible(),

    // A draft saves freely; a published sample saves through the stricter
    // "Publish updates" action. Both toast the same success.
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

import { expect, type Page } from "@playwright/test";

export function shareSamplePage(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Share this sample" });
  const colleague = (name: string) =>
    dialog.getByRole("option").filter({ hasText: name });
  return {
    open: () => page.getByRole("button", { name: "Share" }).click(),
    close: () => dialog.getByRole("button", { name: "Close" }).click(),
    expectNoCollaborator: () =>
      expect(dialog.getByText("No collaborator yet")).toBeVisible(),
    // The directory loads with the dialog, before anything is typed.
    expectColleagueOffered: (name: string) =>
      expect(colleague(name)).toBeVisible(),
    pickColleague: (name: string) => colleague(name).click(),
    expectCollaborator: (email: string) =>
      expect(
        dialog.getByRole("listitem").filter({ hasText: email }),
      ).toBeVisible(),
  };
}

import { expect, type Page } from "@playwright/test";

export function shareSamplePage(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Share this sample" });
  // The suggestions render in a popover, portaled outside the dialog.
  const colleague = (name: string) =>
    page.getByRole("option").filter({ hasText: name });
  return {
    open: () => page.getByRole("button", { name: "Share" }).click(),
    close: () => dialog.getByRole("button", { name: "Close" }).click(),
    openPicker: () =>
      dialog.getByRole("combobox", { name: "Search a colleague" }).click(),
    expectOwner: (name: string, email: string) =>
      expect(dialog.getByText(`${name} ${email}`)).toBeVisible(),
    expectNoCollaborator: () =>
      expect(dialog.getByText("No collaborator yet")).toBeVisible(),
    expectColleagueOffered: (name: string) =>
      expect(colleague(name)).toBeVisible(),
    pickColleague: (name: string) => colleague(name).click(),
    expectCollaborator: (email: string) =>
      expect(
        dialog.getByRole("listitem").filter({ hasText: email }),
      ).toBeVisible(),
  };
}

import { expect, type Page } from "@playwright/test";

// The section renders nothing when no group is offered, so the assertion only
// means something once the query behind it has answered.
export const waitForMyManualGroups = (page: Page) =>
  page.waitForResponse((response) =>
    response.url().includes("currentUser/manual-groups"),
  );

export const expectNoManualGroupOffered = (page: Page) =>
  expect(
    page.getByRole("heading", { name: "Manual groups", level: 2 }),
  ).toBeHidden();

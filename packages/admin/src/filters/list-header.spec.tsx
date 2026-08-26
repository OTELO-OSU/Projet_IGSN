import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { ListHeader } from "./list-header.tsx";

const ADD = "Add a filter";

const TITLE = "Samples";

const search = {
  name: "search",
  label: "Search",
  cell: <input aria-label="Search" />,
};

const status = (onRemove = vi.fn(), active = false) => ({
  name: "status",
  label: "Status",
  active,
  onRemove,
  cell: <input aria-label="Status" />,
});

describe("ListHeader", () => {
  it("should hide an optional filter until the user adds it", async () => {
    const screen = await render(
      <ListHeader title={TITLE} filters={[search, status()]} />,
    );

    await expect.element(screen.getByLabelText("Search")).toBeVisible();
    expect(
      screen.getByLabelText("Status", { exact: true }).elements(),
    ).toHaveLength(0);

    await screen.getByRole("button", { name: ADD }).click();
    await screen.getByRole("button", { name: "Status" }).click();

    await expect
      .element(screen.getByLabelText("Status", { exact: true }))
      .toBeVisible();
  });

  it("should show an optional filter that already carries a value", async () => {
    const screen = await render(
      <ListHeader title={TITLE} filters={[search, status(vi.fn(), true)]} />,
    );

    await expect
      .element(screen.getByLabelText("Status", { exact: true }))
      .toBeVisible();
    expect(screen.getByRole("button", { name: ADD }).elements()).toHaveLength(
      0,
    );
  });

  it("should clear the value and hide the filter when removed", async () => {
    const onRemove = vi.fn();
    const screen = await render(
      <ListHeader title={TITLE} filters={[search, status(onRemove)]} />,
    );

    await screen.getByRole("button", { name: ADD }).click();
    await screen.getByRole("button", { name: "Status" }).click();
    await screen
      .getByRole("button", { name: "Remove the Status filter" })
      .click();

    expect(onRemove).toHaveBeenCalled();
    expect(
      screen.getByLabelText("Status", { exact: true }).elements(),
    ).toHaveLength(0);
  });

  it("should sit the add-filter and the action buttons on the heading row", async () => {
    const screen = await render(
      <ListHeader
        title={TITLE}
        action={<button type="button">Create</button>}
        filters={[search, status()]}
      />,
    );

    const heading = screen.getByRole("heading", { level: 1, name: TITLE });
    await expect.element(heading).toBeVisible();

    const row = heading.element().parentElement;

    expect(
      [...(row?.querySelectorAll("button") ?? [])].map(
        (button) => button.textContent,
      ),
    ).toEqual([ADD, "Create"]);
  });
});

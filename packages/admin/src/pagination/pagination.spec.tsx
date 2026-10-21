import { vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render } from "../../test/render.tsx";
import { Pagination } from "./pagination.tsx";

const noop = () => {};

const renderPager = (onPageChange = vi.fn(), currentPage = 3) =>
  render(
    <Pagination
      page={currentPage}
      pageCount={5}
      perPage={10}
      onPageChange={onPageChange}
      onPerPageChange={noop}
    />,
  );

describe("Pagination", () => {
  it("should show the current page in the page input and the page count", async () => {
    const screen = await renderPager(vi.fn(), 2);

    await expect
      .element(screen.getByLabelText("Page", { exact: true }))
      .toHaveValue("2");
    await expect.element(screen.getByText("/ 5")).toBeVisible();
  });

  it("should show a page changed from outside in the page input", async () => {
    const screen = await renderPager(vi.fn(), 2);

    await screen.rerender(
      <Pagination
        page={4}
        pageCount={5}
        perPage={10}
        onPageChange={noop}
        onPerPageChange={noop}
      />,
    );

    await expect
      .element(screen.getByLabelText("Page", { exact: true }))
      .toHaveValue("4");
  });

  it.each([
    ["Enter", "4", 4],
    ["blur", "4", 4],
    ["Enter", "0", 1],
    ["Enter", "9", 5],
  ])(
    "should jump on %s from a typed %s to page %i",
    async (commit, typed, expected) => {
      const onPageChange = vi.fn();
      const screen = await renderPager(onPageChange);

      await screen.getByLabelText("Page", { exact: true }).fill(typed);
      await userEvent.keyboard(commit === "Enter" ? "{Enter}" : "{Tab}");

      expect(onPageChange).toHaveBeenCalledWith(expected);
    },
  );

  it.each(["", "2.5", "abc"])(
    "should revert a typed %j to the current page without a call",
    async (typed) => {
      const onPageChange = vi.fn();
      const screen = await renderPager(onPageChange);

      await screen.getByLabelText("Page", { exact: true }).fill(typed);
      await userEvent.keyboard("{Enter}");

      await expect
        .element(screen.getByLabelText("Page", { exact: true }))
        .toHaveValue("3");
      expect(onPageChange).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["First", 1],
    ["Last", 5],
  ])("should call %s with page %i", async (name, expected) => {
    const onPageChange = vi.fn();
    const screen = await renderPager(onPageChange);

    await screen.getByRole("button", { name }).click();

    expect(onPageChange).toHaveBeenCalledWith(expected);
  });

  it.each([
    ["First", 1],
    ["Last", 5],
  ])("should disable %s on page %i", async (name, currentPage) => {
    const screen = await renderPager(vi.fn(), currentPage);

    await expect.element(screen.getByRole("button", { name })).toBeDisabled();
  });

  it("should offer 100 rows per page", async () => {
    const screen = await renderPager();

    await screen.getByRole("combobox").click();

    await expect
      .element(page.getByRole("option", { name: "100" }))
      .toBeVisible();
  });

  it("should disable Previous on the first page", async () => {
    const screen = await render(
      <Pagination
        page={1}
        pageCount={5}
        perPage={10}
        onPageChange={noop}
        onPerPageChange={noop}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Previous" }))
      .toBeDisabled();
  });

  it("should disable Next on the last page", async () => {
    const screen = await render(
      <Pagination
        page={5}
        pageCount={5}
        perPage={10}
        onPageChange={noop}
        onPerPageChange={noop}
      />,
    );

    await expect
      .element(screen.getByRole("button", { name: "Next" }))
      .toBeDisabled();
  });

  it("should go to the previous page when Previous is clicked", async () => {
    const onPageChange = vi.fn();
    const screen = await render(
      <Pagination
        page={3}
        pageCount={5}
        perPage={10}
        onPageChange={onPageChange}
        onPerPageChange={noop}
      />,
    );

    await screen.getByRole("button", { name: "Previous" }).click();

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("should go to the next page when Next is clicked", async () => {
    const onPageChange = vi.fn();
    const screen = await render(
      <Pagination
        page={3}
        pageCount={5}
        perPage={10}
        onPageChange={onPageChange}
        onPerPageChange={noop}
      />,
    );

    await screen.getByRole("button", { name: "Next" }).click();

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("should change the page size when a new size is selected", async () => {
    const onPerPageChange = vi.fn();
    const screen = await render(
      <Pagination
        page={1}
        pageCount={5}
        perPage={10}
        onPageChange={noop}
        onPerPageChange={onPerPageChange}
      />,
    );

    await screen.getByRole("combobox").click();
    await page.getByRole("option", { name: "25" }).click();

    expect(onPerPageChange).toHaveBeenCalledWith(25);
  });
});

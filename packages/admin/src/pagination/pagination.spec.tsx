import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { Pagination } from "./pagination.tsx";

const noop = () => {};
const pageSizes = [10, 25, 50];

describe("Pagination", () => {
  it("should show the current page and page count", async () => {
    const screen = await render(
      <Pagination
        page={2}
        pageCount={5}
        perPage={10}
        pageSizes={pageSizes}
        onPageChange={noop}
        onPerPageChange={noop}
      />,
    );

    await expect.element(screen.getByText("2 / 5")).toBeVisible();
  });

  it("should disable Previous on the first page", async () => {
    const screen = await render(
      <Pagination
        page={1}
        pageCount={5}
        perPage={10}
        pageSizes={pageSizes}
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
        pageSizes={pageSizes}
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
        pageSizes={pageSizes}
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
        pageSizes={pageSizes}
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
        pageSizes={pageSizes}
        onPageChange={noop}
        onPerPageChange={onPerPageChange}
      />,
    );

    await screen.getByRole("combobox").click();
    await page.getByRole("option", { name: "25" }).click();

    expect(onPerPageChange).toHaveBeenCalledWith(25);
  });
});

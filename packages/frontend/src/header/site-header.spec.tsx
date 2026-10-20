import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import { stubAuth } from "../../test/stub-auth.tsx";
import { SiteHeader } from "./site-header.tsx";

async function renderHeader(initialPath = "/") {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <SiteHeader />
        <Outlet />
      </>
    ),
  });
  const routes = ["/", "/faq", "/partners", "/search", "/samples/$igsn"].map(
    (path) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => null,
      }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  await render(stubAuth(<RouterProvider router={router} />));
}

const menuButton = () => page.getByRole("button", { name: "Menu" });

describe("SiteHeader", () => {
  it.each(["/search", "/samples/IGSN123"])(
    "should mark the Search link as the current page on the search result %s",
    async (path) => {
      await renderHeader(path);

      await expect
        .element(page.getByRole("link", { name: "Search" }))
        .toHaveAttribute("aria-current", "page");
    },
  );

  it("should offer the other language inside the menu", async () => {
    await renderHeader();

    await menuButton().click();

    await expect
      .element(
        page.getByRole("banner").getByRole("button", { name: "Français" }),
      )
      .toBeVisible();
  });

  it("should open the menu on the menu button, revealing the nav links", async () => {
    await renderHeader();
    await expect
      .element(menuButton())
      .toHaveAttribute("aria-expanded", "false");

    await menuButton().click();

    await expect.element(menuButton()).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(page.getByRole("link", { name: "Partners" }))
      .toBeInTheDocument();
  });

  it("should close the menu once the reader follows a link", async () => {
    await renderHeader();
    await menuButton().click();

    await page.getByRole("link", { name: "Partners" }).click();

    await expect
      .element(menuButton())
      .toHaveAttribute("aria-expanded", "false");
  });

  it("should close the menu on Escape and give focus back to the menu button", async () => {
    await renderHeader();
    await menuButton().click();
    await userEvent.tab();

    await userEvent.keyboard("{Escape}");

    await expect
      .element(menuButton())
      .toHaveAttribute("aria-expanded", "false");
    await expect.element(menuButton()).toHaveFocus();
  });

  it("should close the menu on a click outside it", async () => {
    await renderHeader();
    await menuButton().click();

    await page.getByRole("link", { name: "IGSN" }).click();

    await expect
      .element(menuButton())
      .toHaveAttribute("aria-expanded", "false");
  });
});

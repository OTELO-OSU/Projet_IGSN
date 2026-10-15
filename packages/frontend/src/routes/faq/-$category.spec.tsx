import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";

import { NotFoundNotice } from "#/not-found-notice.tsx";

import { Route as CategoryRoute } from "./$category.tsx";

function renderCategory(url: string) {
  const rootRoute = createRootRoute();
  const categoryRoute = createRoute({
    ...CategoryRoute.options,
    getParentRoute: () => rootRoute,
    path: "/faq/$category",
  } as Parameters<typeof createRoute>[0]);
  const router = createRouter({
    routeTree: rootRoute.addChildren([categoryRoute]),
    defaultNotFoundComponent: NotFoundNotice,
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("FAQ category page", () => {
  it("should expand a question of the category on click", async () => {
    const screen = await renderCategory("/faq/account");
    const question = screen.getByRole("button", { name: "How do I sign in?" });

    await expect.element(question).toHaveAttribute("aria-expanded", "false");
    await question.click();

    await expect.element(question).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(screen.getByText(/through the RENATER identity federation/))
      .toBeVisible();
  });

  it("should expand the questions matching the query in the URL", async () => {
    const screen = await renderCategory("/faq/account?q=orcid");

    await expect
      .element(screen.getByRole("searchbox", { name: "Search the FAQ" }))
      .toHaveValue("orcid");
    await expect
      .element(
        screen.getByRole("button", {
          name: "How do I link my ORCID to my IGSN account?",
        }),
      )
      .toHaveAttribute("aria-expanded", "true");
  });

  it("should show the not-found notice for an unknown category", async () => {
    const screen = await renderCategory("/faq/nope");

    await expect
      .element(
        screen.getByRole("heading", { level: 1, name: "Page not found" }),
      )
      .toBeVisible();
  });
});

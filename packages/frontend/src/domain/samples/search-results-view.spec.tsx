import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SearchResultsView } from "./search-results-view.tsx";

const sample = {
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Basalt 42",
  material: "rock.igneous",
} as unknown as Sample;

// SampleList links to the sample route, so mount inside a minimal router.
function renderView(props: Parameters<typeof SearchResultsView>[0]) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <SearchResultsView {...props} />,
  });
  const sampleRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/samples/$igsn",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, sampleRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("SearchResultsView", () => {
  it("should list the matching samples with their count", async () => {
    const screen = await renderView({
      samples: [sample],
      total: 1,
      page: 1,
      pageCount: 1,
      onPageChange: vi.fn(),
    });

    await expect.element(screen.getByText("1 results")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /Basalt 42/ }))
      .toBeInTheDocument();
  });

  it("should show the empty message on zero matches, not the list", async () => {
    const screen = await renderView({
      samples: [],
      total: 0,
      page: 1,
      pageCount: 1,
      emptyMessage: "No published samples in the selected area.",
      onPageChange: vi.fn(),
    });

    await expect
      .element(screen.getByText("No published samples in the selected area."))
      .toBeInTheDocument();
    expect(screen.getByText("0 results").query()).toBeNull();
  });
});

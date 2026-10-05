import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "vitest-browser-react";

import type { MyRouterContext } from "#/router-context.ts";

import { Route as SearchRoute } from "./search.tsx";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

function renderSearch(facetCounts: () => Promise<Response>) {
  vi.stubGlobal("fetch", (input: URL) => {
    if (input.pathname.endsWith("/samples/facets")) return facetCounts();
    if (input.pathname.endsWith("/samples"))
      return json({ data: [], meta: { total: 0 } });
    return json({ data: [] });
  });
  const rootRoute = createRootRouteWithContext<MyRouterContext>()();
  const searchRoute = createRoute({
    ...SearchRoute.options,
    getParentRoute: () => rootRoute,
    path: "/search",
  } as Parameters<typeof createRoute>[0]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([searchRoute]),
    context: { queryClient },
    history: createMemoryHistory({
      initialEntries: ["/search?nature=hand_sample"],
    }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("search page", () => {
  it.each([
    { state: "pending", facetCounts: () => new Promise<Response>(() => {}) },
    { state: "failed", facetCounts: () => json({}, 500) },
  ])(
    "should render the results while the facet counts are $state",
    async ({ facetCounts }) => {
      const screen = await renderSearch(facetCounts);

      await expect
        .element(screen.getByText("No samples match your search."))
        .toBeVisible();
    },
  );
});

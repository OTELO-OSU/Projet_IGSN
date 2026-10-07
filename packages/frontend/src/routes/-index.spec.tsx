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

import { stubAuth } from "../../test/stub-auth.tsx";
import { Route as HomeRoute } from "./index.tsx";

function renderHome(stats: () => Promise<Response>) {
  vi.stubGlobal("fetch", stats);
  const rootRoute = createRootRouteWithContext<MyRouterContext>()();
  const homeRoute = createRoute({
    ...HomeRoute.options,
    getParentRoute: () => rootRoute,
    path: "/",
  } as Parameters<typeof createRoute>[0]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute]),
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    stubAuth(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  );
}

const json =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("home page", () => {
  it.each([
    {
      stats: { samples: 23562, users: 4721 },
      counters: ["23,562 samples declared", "4,721 users"],
    },
    {
      stats: { samples: 0, users: 0 },
      counters: ["0 samples declared", "0 users"],
    },
  ])("should show the counters $counters", async ({ stats, counters }) => {
    const screen = await renderHome(json({ data: stats }));

    for (const counter of counters) {
      await expect.element(screen.getByText(counter)).toBeVisible();
    }
  });

  it("should hide the counters but keep the search when the stats call fails", async () => {
    const screen = await renderHome(json({}, 500));

    await expect
      .element(screen.getByRole("searchbox", { name: "Search samples" }))
      .toBeVisible();
    await expect
      .element(screen.getByText(/samples declared/))
      .not.toBeInTheDocument();
  });
});

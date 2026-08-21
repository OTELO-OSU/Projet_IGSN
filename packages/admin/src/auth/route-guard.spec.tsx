import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { HttpResponse, delay, http } from "msw";
import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { worker } from "../../test/msw.ts";
import { SuperAdminOnly } from "./super-admin-only.tsx";
import { UserModerationOnly } from "./user-moderation-only.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const failIdentity = () =>
  worker.use(
    http.get(
      "*/admin/currentUser",
      () => new HttpResponse(null, { status: 500 }),
    ),
  );

const stallIdentity = () =>
  worker.use(
    http.get("*/admin/currentUser", async () => {
      await delay(2000);
      return new HttpResponse(null, { status: 500 });
    }),
  );

async function renderGuarded(
  Guard: (props: { children?: ReactNode }) => ReactNode,
) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <p>Home page</p>,
  });
  const guardedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/guarded",
    component: () => (
      <Guard>
        <p>Guarded page</p>
      </Guard>
    ),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, guardedRoute]),
    history: createMemoryHistory({ initialEntries: ["/guarded"] }),
  });
  const screen = await render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return { screen, router };
}

describe("RouteGuard", () => {
  it.each([
    [
      "a super admin under SuperAdminOnly",
      SuperAdminOnly,
      { superAdmin: true },
    ],
    [
      "a super admin under UserModerationOnly",
      UserModerationOnly,
      { superAdmin: true },
    ],
    [
      "a space manager under UserModerationOnly",
      UserModerationOnly,
      { managedLaboratories: ["UMR7358"] },
    ],
  ])("should render the guarded page for %s", async (_case, Guard, caller) => {
    fakeCurrentUser(caller);

    const { screen } = await renderGuarded(Guard);

    await expect.element(screen.getByText("Guarded page")).toBeVisible();
  });

  it.each([
    ["is not a super admin", SuperAdminOnly],
    ["moderates nothing", UserModerationOnly],
  ])(
    "should send a user who %s back to the home page",
    async (_case, Guard) => {
      fakeCurrentUser();

      const { screen, router } = await renderGuarded(Guard);

      await expect.element(screen.getByText("Home page")).toBeVisible();
      expect(screen.getByText("Guarded page").elements()).toHaveLength(0);
      expect(router.state.location.pathname).toBe("/");
    },
  );

  it("should send a user back to the home page when the identity call fails", async () => {
    failIdentity();

    const { screen, router } = await renderGuarded(SuperAdminOnly);

    await expect.element(screen.getByText("Home page")).toBeVisible();
    expect(router.state.location.pathname).toBe("/");
  });

  it("should show nothing while the identity is still loading", async () => {
    stallIdentity();

    const { screen, router } = await renderGuarded(SuperAdminOnly);

    expect(screen.getByText("Guarded page").elements()).toHaveLength(0);
    expect(screen.getByText("Home page").elements()).toHaveLength(0);
    expect(router.state.location.pathname).toBe("/guarded");
  });
});

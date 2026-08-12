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

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

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
    <SuperAdminOnly>
      <p>Guarded page</p>
    </SuperAdminOnly>
  ),
});

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

async function renderGuarded() {
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

describe("SuperAdminOnly", () => {
  it("should render the guarded page for a super admin", async () => {
    fakeCurrentUser({ superAdmin: true });

    const { screen } = await renderGuarded();

    await expect.element(screen.getByText("Guarded page")).toBeVisible();
  });

  it("should send a user who is not a super admin back to the home page", async () => {
    fakeCurrentUser({ superAdmin: false });

    const { screen, router } = await renderGuarded();

    await expect.element(screen.getByText("Home page")).toBeVisible();
    expect(screen.getByText("Guarded page").elements()).toHaveLength(0);
    expect(router.state.location.pathname).toBe("/");
  });

  it("should send a user back to the home page when the identity call fails", async () => {
    failIdentity();

    const { screen, router } = await renderGuarded();

    await expect.element(screen.getByText("Home page")).toBeVisible();
    expect(router.state.location.pathname).toBe("/");
  });

  it("should show nothing while the identity is still loading", async () => {
    stallIdentity();

    const { screen, router } = await renderGuarded();

    expect(screen.getByText("Guarded page").elements()).toHaveLength(0);
    expect(screen.getByText("Home page").elements()).toHaveLength(0);
    expect(router.state.location.pathname).toBe("/guarded");
  });
});

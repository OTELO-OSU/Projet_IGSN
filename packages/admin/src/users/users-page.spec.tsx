import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { HttpResponse, http } from "msw";
import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { CALLER_GROUPS } from "../../test/caller-groups.ts";
import { worker } from "../../test/msw.ts";
import { routeTree } from "../routeTree.gen.ts";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      access_token: "tok",
      profile: { identity_provider: "shibboleth", name: "Marie Dupont" },
    },
  }),
}));

const user = (index: number, status: "pending" | "accepted" | "rejected") => ({
  id: `3f2504e0-4f89-41d3-9a0c-0305000000${String(index).padStart(2, "0")}`,
  email: `user${index}@univ-lorraine.fr`,
  name: `Name${index}`,
  firstname: `First${index}`,
  orcid: null,
  status,
  superAdmin: false,
});

// More than the smallest page size (10), so paging is a real second request.
const USERS = [
  user(1, "pending"),
  user(2, "accepted"),
  user(3, "rejected"),
  ...Array.from({ length: 9 }, (_, i) => user(i + 4, "accepted")),
];

// In-memory API: /admin/users answers the filtered, paginated page the way the
// server would, so the URL is what drives what the page shows.
function fakeApi({ forbidden = false }: { forbidden?: boolean } = {}) {
  const requested: string[] = [];
  worker.use(
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        sub: "s",
        name: "Marie Dupont",
        orcid: null,
        status: "accepted",
        superAdmin: true,
        ...CALLER_GROUPS,
      }),
    ),
    http.get("*/admin/users/:id", ({ params }) =>
      HttpResponse.json({
        data: USERS.find((candidate) => candidate.id === params.id),
      }),
    ),
    http.get("*/admin/users", ({ request }) => {
      if (forbidden) {
        return HttpResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const url = new URL(request.url);
      requested.push(url.search);
      const status = url.searchParams.get("status");
      const perPage = Number(url.searchParams.get("perPage") ?? "25");
      const page = Number(url.searchParams.get("page") ?? "1");
      const matching = status
        ? USERS.filter((candidate) => candidate.status === status)
        : USERS;
      return HttpResponse.json({
        data: matching.slice((page - 1) * perPage, page * perPage),
        meta: { total: matching.length },
      });
    }),
  );
  return { requested };
}

async function renderUsersPage(url = "/users") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [url] }),
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

describe("UsersPage", () => {
  it("should list every user with their name, email and status", async () => {
    fakeApi();

    const { screen } = await renderUsersPage();

    await expect
      .element(screen.getByRole("cell", { name: "user1@univ-lorraine.fr" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "Name1", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "Pending" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "user3@univ-lorraine.fr" }))
      .toBeVisible();
  });

  it("should restore a filter and page from the URL", async () => {
    const { requested } = fakeApi();

    const { screen } = await renderUsersPage("/users?status=pending&page=1");

    await expect
      .element(screen.getByRole("cell", { name: "user1@univ-lorraine.fr" }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: "user2@univ-lorraine.fr" }).elements(),
    ).toHaveLength(0);
    expect(requested.at(-1)).toContain("status=pending");
  });

  it("should ask the server for the filtered set and reset to page 1", async () => {
    const { requested } = fakeApi();
    const { screen, router } = await renderUsersPage(
      "/users?page=2&perPage=10",
    );

    await expect
      .element(screen.getByRole("cell", { name: "user11@univ-lorraine.fr" }))
      .toBeVisible();

    await screen.getByRole("combobox", { name: "Status" }).click();
    await screen.getByRole("option", { name: "Rejected" }).click();

    await expect
      .element(screen.getByRole("cell", { name: "user3@univ-lorraine.fr" }))
      .toBeVisible();
    expect(requested.at(-1)).toContain("status=rejected");
    await expect
      .poll(() => router.state.location.search)
      .toMatchObject({ page: 1, status: "rejected" });
  });

  it("should page through the list from the server", async () => {
    const { requested } = fakeApi();

    const { screen, router } = await renderUsersPage(
      "/users?page=1&perPage=10",
    );
    await expect
      .element(screen.getByRole("cell", { name: "user1@univ-lorraine.fr" }))
      .toBeVisible();

    await screen.getByRole("button", { name: "Next" }).click();

    await expect
      .poll(() => router.state.location.search)
      .toMatchObject({ page: 2 });
    expect(requested.at(-1)).toContain("page=2");
  });

  it("should open an account from its row", async () => {
    fakeApi();

    const { screen, router } = await renderUsersPage();
    await screen.getByRole("link", { name: "Name1", exact: true }).click();

    await expect
      .poll(() => router.state.location.pathname)
      .toBe("/users/3f2504e0-4f89-41d3-9a0c-030500000001");
  });

  it("should render an error and no user data when the api refuses", async () => {
    fakeApi({ forbidden: true });

    const { screen } = await renderUsersPage();

    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("table").elements()).toHaveLength(0);
  });
});

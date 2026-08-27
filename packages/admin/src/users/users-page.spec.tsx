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
import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { worker } from "../../test/msw.ts";
import { routeTree } from "../routeTree.gen.ts";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      access_token: "tok",
      profile: { identity_provider: "satosa", name: "Marie Dupont" },
    },
  }),
}));

const manualGroup = (index: number) => ({
  id: `3f2504e0-4f89-41d3-9a0c-0305000001${String(index).padStart(2, "0")}`,
  name: `Group${index}`,
  canDetach: true,
});

const user = (
  index: number,
  status: "pending" | "accepted" | "rejected",
  manualGroups: ReturnType<typeof manualGroup>[] = [],
) => ({
  id: `3f2504e0-4f89-41d3-9a0c-0305000000${String(index).padStart(2, "0")}`,
  email: `user${index}@univ-lorraine.fr`,
  name: `Name${index}`,
  firstname: `First${index}`,
  orcid: null,
  status,
  superAdmin: false,
  manualGroups,
});

const USERS = [
  user(1, "pending", [1, 2, 3, 4].map(manualGroup)),
  { ...user(2, "accepted"), ...CALLER_GROUPS },
  user(3, "rejected"),
  ...Array.from({ length: 9 }, (_, i) => user(i + 4, "accepted")),
];

function fakeApi({ forbidden = false }: { forbidden?: boolean } = {}) {
  const requested: string[] = [];
  const deleted: string[] = [];
  fakeCurrentUser({ superAdmin: true });
  worker.use(
    http.delete("*/admin/users/:id/institutional-groups", ({ params }) => {
      deleted.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/users/:id", ({ params }) =>
      HttpResponse.json({
        data: USERS.find((candidate) => candidate.id === params.id),
      }),
    ),
    http.get("*/admin/manual-groups", () =>
      HttpResponse.json({
        data: [{ ...manualGroup(1), memberCount: 0 }],
        meta: { total: 1 },
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
  return { requested, deleted };
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

  it("should cut the group column to the first three names", async () => {
    fakeApi();

    const { screen } = await renderUsersPage();

    await expect
      .element(screen.getByRole("cell", { name: "Group1, Group2, Group3 …" }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: /Group4/ }).elements(),
    ).toHaveLength(0);
  });

  it("should list the institution of a user", async () => {
    fakeApi();

    const { screen } = await renderUsersPage();

    await expect
      .element(
        screen.getByRole("cell", {
          name: "Université de Lorraine OTELo CRPG",
        }),
      )
      .toBeVisible();
  });

  it("should mark a user with no institution and no group as not provided", async () => {
    fakeApi();

    const { screen } = await renderUsersPage("/users?status=rejected");

    await expect
      .element(screen.getByRole("cell", { name: "user3@univ-lorraine.fr" }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: "Not provided" }).elements(),
    ).toHaveLength(2);
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
    await screen.getByRole("option", { name: "Disabled" }).click();

    await expect
      .element(screen.getByRole("cell", { name: "user3@univ-lorraine.fr" }))
      .toBeVisible();
    expect(requested.at(-1)).toContain("status=rejected");
    await expect
      .poll(() => router.state.location.search)
      .toMatchObject({ page: 1, status: "rejected" });
  });

  it("should ask the server for the searched users on page 1", async () => {
    const { requested } = fakeApi();
    const { screen } = await renderUsersPage("/users?page=2&perPage=10");

    await screen.getByLabelText("Search users").fill("curie");

    await expect.poll(() => requested.at(-1)).toContain("search=curie");
    expect(requested.at(-1)).toContain("page=1");
  });

  it("should map the picked institution onto the institutional params", async () => {
    const { requested } = fakeApi();
    const { screen } = await renderUsersPage();

    await screen.getByRole("button", { name: "Add a filter" }).click();
    await screen
      .getByRole("dialog")
      .getByRole("button", { name: "Institution" })
      .click();
    await screen.getByRole("combobox", { name: "Institution" }).click();
    await screen
      .getByLabelText("Search institutions")
      .fill("Université d'Orléans");
    await screen
      .getByRole("button", { name: "OSUC (OSUC)", exact: true })
      .click();

    await expect
      .poll(() => requested.at(-1))
      .toContain("institutionalOrganization=014zrew76");
    expect(requested.at(-1)).toContain("institutionalOsu=OSUC");
  });

  it("should ask the server for the picked manual group", async () => {
    const { requested } = fakeApi();
    const { screen } = await renderUsersPage();

    await screen.getByRole("button", { name: "Add a filter" }).click();
    await screen
      .getByRole("dialog")
      .getByRole("button", { name: "Manual group" })
      .click();
    await screen.getByRole("combobox", { name: "Manual group" }).click();
    await screen.getByRole("option", { name: "Group1" }).click();

    await expect
      .poll(() => requested.at(-1))
      .toContain(`manualGroup=${manualGroup(1).id}`);
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

  it("should remove the institution of a row without opening the account", async () => {
    const { deleted } = fakeApi();

    const { screen, router } = await renderUsersPage();
    await screen
      .getByRole("button", {
        name: "Remove First2 Name2 from their institution",
      })
      .click();
    await screen
      .getByRole("button", { name: "Remove from institution", exact: true })
      .click();

    await expect
      .element(
        screen.getByText(
          "Institution removed, account back to pending moderation",
        ),
      )
      .toBeVisible();
    expect(deleted).toEqual(["3f2504e0-4f89-41d3-9a0c-030500000002"]);
    expect(router.state.location.pathname).toBe("/users");
  });

  it("should offer no removal on an account with no institution", async () => {
    fakeApi();

    const { screen } = await renderUsersPage();

    await expect
      .element(
        screen.getByRole("button", {
          name: "Remove First2 Name2 from their institution",
        }),
      )
      .toBeVisible();
    expect(
      screen
        .getByRole("button", {
          name: "Remove First1 Name1 from their institution",
        })
        .elements(),
    ).toHaveLength(0);
  });

  it("should render an error and no user data when the api refuses", async () => {
    fakeApi({ forbidden: true });

    const { screen } = await renderUsersPage();

    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("table").elements()).toHaveLength(0);
  });
});

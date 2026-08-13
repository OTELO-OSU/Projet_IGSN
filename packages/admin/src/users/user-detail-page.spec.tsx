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
      profile: { identity_provider: "satosa", name: "Marie Dupont" },
    },
  }),
}));

const USER_ID = "3f2504e0-4f89-41d3-9a0c-030500000001";

type Options = {
  status?: "pending" | "accepted" | "rejected";
  name?: string | null;
  firstname?: string | null;
  failPut?: boolean;
  failGet?: boolean;
};

// In-memory API: the PUT stores the new status, so the page reflects what the
// server accepted rather than an optimistic guess.
function fakeApi({
  status = "pending",
  name = "Durand",
  firstname = "Paul",
  failPut = false,
  failGet = false,
}: Options) {
  let user = {
    id: USER_ID,
    email: "paul.durand@univ-lorraine.fr",
    name,
    firstname,
    orcid: null,
    status,
    superAdmin: false,
    ...CALLER_GROUPS,
  };
  const calls: string[] = [];
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
    http.put("*/admin/users/:id/status", async ({ request }) => {
      if (failPut) return new HttpResponse(null, { status: 500 });
      const body = (await request.json()) as { status: typeof status };
      calls.push(`PUT ${body.status}`);
      user = { ...user, status: body.status };
      return HttpResponse.json({ data: user });
    }),
    http.get("*/admin/users/:id", () => {
      if (failGet) return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ data: user });
    }),
  );
  return { calls };
}

async function renderUserPage(options: Options = {}) {
  const { calls } = fakeApi(options);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [`/users/${USER_ID}`] }),
  });
  const screen = await render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return { screen, calls };
}

describe("UserDetailPage", () => {
  it("should show the account read-only, with no editable field", async () => {
    const { screen } = await renderUserPage();

    await expect
      .element(screen.getByText("paul.durand@univ-lorraine.fr"))
      .toBeVisible();
    await expect.element(screen.getByText("Pending")).toBeVisible();
    expect(screen.getByRole("textbox").elements()).toHaveLength(0);
  });

  it("should show the institution the user belongs to", async () => {
    const { screen } = await renderUserPage();

    await expect
      .element(screen.getByText("Université de Lorraine"))
      .toBeVisible();
    await expect.element(screen.getByText(/\(OTELo\)/)).toBeVisible();
    await expect.element(screen.getByText(/\(CRPG\)/)).toBeVisible();
  });

  it("should offer both decisions on a pending account", async () => {
    const { screen } = await renderUserPage({ status: "pending" });

    await expect
      .element(screen.getByRole("button", { name: "Accept" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Reject" }))
      .toBeVisible();
  });

  it("should leave only Reject actionable on an accepted account", async () => {
    const { screen } = await renderUserPage({ status: "accepted" });

    await expect
      .element(screen.getByRole("button", { name: "Reject" }))
      .toBeEnabled();
    await expect
      .element(screen.getByRole("button", { name: "Accept" }))
      .toBeDisabled();
  });

  it("should leave only Accept actionable on a rejected account", async () => {
    const { screen } = await renderUserPage({ status: "rejected" });

    await expect
      .element(screen.getByRole("button", { name: "Accept" }))
      .toBeEnabled();
    await expect
      .element(screen.getByRole("button", { name: "Reject" }))
      .toBeDisabled();
  });

  it("should name the missing parts of an incomplete account", async () => {
    const { screen } = await renderUserPage({ name: null, firstname: null });

    await expect
      .element(screen.getByText("Not provided").first())
      .toBeVisible();
    expect(screen.getByText("Not provided").elements()).toHaveLength(2);
  });

  it("should report a failed load as an account failure", async () => {
    const { screen } = await renderUserPage({ failGet: true });

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Could not load the account");
  });

  it("should accept a pending account and show the new status", async () => {
    const { screen, calls } = await renderUserPage({ status: "pending" });

    await screen.getByRole("button", { name: "Accept" }).click();

    await expect.element(screen.getByText("Accepted")).toBeVisible();
    await expect
      .element(screen.getByText("Account updated"))
      .toBeInTheDocument();
    expect(calls).toEqual(["PUT accepted"]);
  });

  it("should keep the status when the server refuses the change", async () => {
    const { screen } = await renderUserPage({ failPut: true });

    await screen.getByRole("button", { name: "Accept" }).click();

    await expect
      .element(screen.getByText("Could not update the account"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Pending")).toBeVisible();
  });
});

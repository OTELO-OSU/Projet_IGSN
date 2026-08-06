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
import { page } from "vitest/browser";

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

// In-memory API: GET /admin/currentUser serves the stored orcid, PUT updates it (or
// answers 409). Lets the page run its real load-edit-save cycle backendless.
function fakeApi({
  orcid = null,
  conflict = false,
}: { orcid?: string | null; conflict?: boolean } = {}) {
  const puts: unknown[] = [];
  let stored = orcid;
  worker.use(
    http.put("*/admin/currentUser/orcid", async ({ request }) => {
      if (conflict) return new HttpResponse(null, { status: 409 });
      const body = (await request.json()) as { orcid: string | null };
      puts.push(body);
      stored = body.orcid;
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        sub: "s",
        name: "Marie Dupont",
        email: "marie.dupont@univ-lorraine.fr",
        orcid: stored,
        status: "accepted",
        superAdmin: false,
      }),
    ),
  );
  return puts;
}

async function renderSettingsPage(api: Parameters<typeof fakeApi>[0] = {}) {
  const puts = fakeApi(api);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/settings"] }),
  });
  const screen = render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return { screen, puts };
}

describe("settings page", () => {
  it("should show the stored orcid", async () => {
    await renderSettingsPage({ orcid: "0000-0002-1825-0097" });
    await expect
      .element(page.getByLabelText(/orcid/i))
      .toHaveValue("0000-0002-1825-0097");
  });

  it("should save a valid orcid", async () => {
    const { puts } = await renderSettingsPage();
    await page.getByLabelText(/orcid/i).fill("0000-0002-1825-0097");
    await page.getByRole("button", { name: /save/i }).click();
    await expect.element(page.getByText(/orcid id saved/i)).toBeInTheDocument();
    expect(puts).toEqual([{ orcid: "0000-0002-1825-0097" }]);
  });

  it("should clear the orcid when the field is emptied", async () => {
    const { puts } = await renderSettingsPage({
      orcid: "0000-0002-1825-0097",
    });
    await page.getByLabelText(/orcid/i).fill("");
    await page.getByRole("button", { name: /save/i }).click();
    await expect.element(page.getByText(/orcid id saved/i)).toBeInTheDocument();
    expect(puts).toEqual([{ orcid: null }]);
  });

  it("should reject a malformed orcid without calling the api", async () => {
    const { puts } = await renderSettingsPage();
    await page.getByLabelText(/orcid/i).fill("not-an-orcid");
    await page.getByRole("button", { name: /save/i }).click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(/invalid orcid/i);
    expect(puts).toEqual([]);
  });

  it("should surface a conflict when another account holds the orcid", async () => {
    await renderSettingsPage({ conflict: true });
    await page.getByLabelText(/orcid/i).fill("0000-0002-1825-0097");
    await page.getByRole("button", { name: /save/i }).click();
    await expect
      .element(page.getByText(/already linked to another account/i))
      .toBeInTheDocument();
  });
});

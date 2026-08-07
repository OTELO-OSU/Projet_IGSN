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

function fakeApi(failWrites = false) {
  let sample: Record<string, unknown> | null = null;
  const lockCalls: string[] = [];
  worker.use(
    // The create page must never call these; a 500 would show up as a failure
    // if it did.
    http.put("*/samples/:id/lock", () => {
      lockCalls.push("PUT");
      return new HttpResponse(null, { status: 500 });
    }),
    http.delete(
      "*/samples/:id/lock",
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        sub: "user-1",
        name: "Marie Dupont",
        status: "accepted",
        superAdmin: false,
      }),
    ),
    http.post("*/samples", async ({ request }) => {
      if (failWrites) {
        return new HttpResponse(null, { status: 500 });
      }
      sample = {
        id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        texture: null,
        metamorphicFacies: null,
        description: null,
        condition: null,
        security: null,
        availability: null,
        publicationYear: null,
        economicInterest: null,
        economicInterestElements: [],
        economicResourceTypePrecision: null,
        economicDepositName: null,
        economicDepositDescription: null,
        ...((await request.json()) as Record<string, unknown>),
        igsn: null,
        published: false,
        createdAt: "2026-07-06T00:00:00.000Z",
        updatedAt: "2026-07-06T00:00:00.000Z",
      };
      return HttpResponse.json({ data: sample }, { status: 201 });
    }),
    http.get("*/samples/:id", () =>
      HttpResponse.json({ data: sample, role: "owner" }),
    ),
  );
  return lockCalls;
}

async function renderCreatePage(failWrites = false) {
  const lockCalls = fakeApi(failWrites);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/samples/create"] }),
  });
  const screen = await render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  return Object.assign(screen, { lockCalls });
}

// Tests run without the app CSS, so the whole page is one vertical flow; the
// default 414x896 viewport leaves deep combobox options outside the viewport,
// where Playwright cannot click them.
beforeAll(() => page.viewport(1280, 1600));

describe("CreateSamplePage", () => {
  it("should redirect to the new sample's edit page after creation", async () => {
    const screen = await renderCreatePage();
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText(/name/i))
      .toHaveValue("Basalte du Massif Central");
  });

  it("should claim no edit lock: the sample has no id yet", async () => {
    const screen = await renderCreatePage();

    await expect
      .element(screen.getByRole("button", { name: "Create" }))
      .toBeVisible();
    expect(screen.lockCalls).toEqual([]);
  });

  it("should show a toast after creation", async () => {
    const screen = await renderCreatePage();
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Sample created");
  });

  it("should create a metamorphic sample with no facies", async () => {
    const screen = await renderCreatePage();
    await screen.getByLabelText(/name/i).fill("Gneiss");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Sample type" }).click();

    await screen
      .getByRole("combobox", { name: "Material *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Rock", exact: true }).click();
    await screen.getByRole("combobox", { name: "Rock *", exact: true }).click();
    await screen
      .getByRole("option", { name: "Metamorphic", exact: true })
      .click();
    await screen
      .getByRole("combobox", { name: "Metamorphic *", exact: true })
      .click();
    await screen
      .getByRole("option", { name: "Strongly metamorphosed", exact: true })
      .click();
    await screen
      .getByRole("combobox", { name: "Strongly metamorphosed *", exact: true })
      .click();
    await screen.getByRole("option", { name: "Gneiss", exact: true }).click();

    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await expect.element(screen.getByLabelText(/name/i)).toHaveValue("Gneiss");
  });

  it("should show an error toast when creation fails", async () => {
    const screen = await renderCreatePage(true);
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Could not create the sample. Please try again.");
  });
});

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

const BASALT_TEAM = {
  id: "3f2504e0-4f89-41d3-9a0c-0305000000a1",
  name: "Basalt team",
  canLeave: true,
};

function fakeApi(failWrites = false) {
  fakeCurrentUser({ sub: "user-1" });
  let sample: Record<string, unknown> | null = null;
  const lockCalls: string[] = [];
  worker.use(
    http.get("*/admin/currentUser/manual-groups", () =>
      HttpResponse.json({ data: [BASALT_TEAM] }),
    ),
    http.put("*/samples/:id/lock", () => {
      lockCalls.push("PUT");
      return new HttpResponse(null, { status: 500 });
    }),
    http.delete(
      "*/samples/:id/lock",
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.post("*/samples", async ({ request }) => {
      if (failWrites) {
        return new HttpResponse(null, { status: 500 });
      }
      sample = {
        id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        texture: null,
        metamorphicFacies: null,
        metamorphicFabric: null,
        description: null,
        condition: null,
        security: null,
        existenceStatus: null,
        availabilityStatus: null,
        publicationYear: null,
        resourceType: null,
        economicInterestElements: [],
        economicResourceTypePrecision: null,
        economicDepositName: null,
        economicDepositDescription: null,
        ...((await request.json()) as Record<string, unknown>),
        igsn: null,
        status: "draft",
        createdAt: "2026-07-06T00:00:00.000Z",
        updatedAt: "2026-07-06T00:00:00.000Z",
      };
      return HttpResponse.json({ data: sample }, { status: 201 });
    }),
    http.get("*/samples/:id", () =>
      HttpResponse.json({ data: sample, role: "owner", managed: false }),
    ),
  );
  return { lockCalls, created: () => sample };
}

async function renderCreatePage(failWrites = false) {
  const { lockCalls, created } = fakeApi(failWrites);
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
  return Object.assign(screen, { lockCalls, created });
}

beforeAll(() => page.viewport(1280, 1600));

describe("CreateSamplePage", () => {
  it("should redirect to the new sample's edit page after creation, with a toast", async () => {
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
    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Sample created");
  });

  it("should claim no edit lock: the sample has no id yet", async () => {
    const screen = await renderCreatePage();

    await expect
      .element(screen.getByRole("button", { name: "Create" }))
      .toBeVisible();
    expect(screen.lockCalls).toEqual([]);
  });

  it("should offer the groups the depositor belongs to and submit the picked one", async () => {
    const screen = await renderCreatePage();
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen
      .getByRole("combobox", { name: "Groups this sample belongs to" })
      .click();
    await screen.getByRole("option", { name: "Basalt team" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    expect(screen.created()).toMatchObject({
      manualGroupIds: [BASALT_TEAM.id],
    });
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

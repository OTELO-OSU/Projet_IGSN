import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

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

// In-memory API: POST creates the sample, GET returns it. Lets the page run
// its real create-then-navigate cycle without a backend.
function fakeApi(failWrites = false) {
  let sample: Record<string, unknown> | null = null;
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    if (failWrites && init?.method === "POST") {
      return new Response(null, { status: 500 });
    }
    if (init?.method === "POST" && typeof init.body === "string") {
      sample = {
        id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
        ...JSON.parse(init.body),
        igsn: null,
        published: false,
        createdAt: "2026-07-06T00:00:00.000Z",
        updatedAt: "2026-07-06T00:00:00.000Z",
      };
      return new Response(JSON.stringify({ data: sample }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ data: sample }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

async function renderCreatePage(failWrites = false) {
  fakeApi(failWrites);
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ["/samples/create"] }),
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

// Fill every mandatory field (name, nature, type) so Create can submit.
async function fillRequiredFields(
  screen: Awaited<ReturnType<typeof renderCreatePage>>,
) {
  await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
  await screen.getByRole("combobox", { name: /nature/i }).click();
  await screen.getByText("Thin section").click();
  await screen.getByRole("tab", { name: "Sample type" }).click();
  await screen.getByRole("combobox", { name: "Type *", exact: true }).click();
  await screen.getByRole("option", { name: "Dredge" }).click();
}

describe("CreateSamplePage", () => {
  it("should redirect to the new sample's edit page after creation", async () => {
    const screen = await renderCreatePage();
    await fillRequiredFields(screen);
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText(/name/i))
      .toHaveValue("Basalte du Massif Central");
  });

  it("should show a toast after creation", async () => {
    const screen = await renderCreatePage();
    await fillRequiredFields(screen);
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Sample created");
  });

  it("should show an error toast when creation fails", async () => {
    const screen = await renderCreatePage(true);
    await fillRequiredFields(screen);
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Could not create the sample. Please try again.");
  });
});

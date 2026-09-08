import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
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
import { pickPath } from "../../test/pick-hierarchy.ts";
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
};

const RELATION_ID = "3f2504e0-4f89-41d3-9a0c-0305000000b1";

const IGSN = "01K072TVWVFK5A1RRZ5MY4PPK9";

function fakeApi(
  failWrites = false,
  failPublish = false,
  currentUserGate?: Promise<void>,
) {
  fakeCurrentUser({ sub: "user-1" });
  let sample: Record<string, unknown> | null = null;
  const lockCalls: string[] = [];
  const calls: string[] = [];
  worker.use(
    http.get("*/admin/currentUser", () => currentUserGate),
    http.get("*/admin/currentUser/manual-groups", () =>
      HttpResponse.json({ data: [] }),
    ),
    http.get("*/admin/currentUser/attachable-manual-groups", () =>
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
      const body = (await request.json()) as {
        relations?: Record<string, unknown>[];
      };
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
        ...body,
        relations: (body.relations ?? []).map((relation) => ({
          targetResourceType: null,
          relationTypeInformation: null,
          relatedMetadataScheme: null,
          schemeURI: null,
          schemeType: null,
          description: null,
          ...relation,
          id: RELATION_ID,
        })),
        igsn: null,
        status: "draft",
        createdAt: "2026-07-06T00:00:00.000Z",
        updatedAt: "2026-07-06T00:00:00.000Z",
      };
      calls.push("POST samples");
      return HttpResponse.json({ data: sample }, { status: 201 });
    }),
    http.post("*/samples/:id/publish", ({ request }) => {
      if (failPublish) return new HttpResponse(null, { status: 500 });
      const status = new URL(request.url).searchParams.get("status");
      sample = { ...sample, status, igsn: IGSN };
      calls.push(`PUBLISH ${status}`);
      return HttpResponse.json({ data: sample, role: "owner" });
    }),
    http.get("*/admin/samples", () =>
      HttpResponse.json({
        data: [
          {
            ...sample,
            owner: { name: "Dupont", firstname: "Marie", status: "accepted" },
          },
        ],
        meta: { total: 1 },
      }),
    ),
    http.get("*/samples/:id", () =>
      HttpResponse.json({ data: sample, role: "owner", managed: false }),
    ),
  );
  return { lockCalls, calls, created: () => sample };
}

async function renderCreatePage(
  failWrites = false,
  failPublish = false,
  currentUserGate?: Promise<void>,
) {
  const { lockCalls, calls, created } = fakeApi(
    failWrites,
    failPublish,
    currentUserGate,
  );
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
  return Object.assign(screen, { lockCalls, calls, created });
}

type CreateScreen = Awaited<ReturnType<typeof renderCreatePage>>;

const pick = async (screen: CreateScreen, field: string, option: string) => {
  await screen.getByRole("combobox", { name: field, exact: true }).click();
  await screen.getByRole("option", { name: option, exact: true }).click();
};

const openTab = (screen: CreateScreen, name: string) =>
  screen.getByRole("tab", { name }).click();

async function fillPublishableSample(screen: CreateScreen) {
  await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
  await pick(screen, "Nature *", "Thin section");
  await pick(screen, "Type *", "Dredge");
  await pick(screen, "Provenance status *", "Collection specimen");
  await screen.getByLabelText("Date *", { exact: true }).fill("2025-06-15");

  await openTab(screen, "Sample classification");
  await pick(screen, "Material *", "Synthetic rock / mineral");
  await pick(screen, "Starting material *", "Natural");
  await pick(screen, "Nature of starting material *", "Powder");
  await pick(screen, "Final product *", "Glass");
  await screen.getByRole("switch", { name: "Duration not relevant" }).click();
  await screen.getByLabelText("Date *", { exact: true }).fill("2025-06-15");
  await screen
    .getByLabelText("Operator name *", { exact: true })
    .fill("Paul Bernard");

  await openTab(screen, "Scientific context");
  await screen.getByLabelText(/collection curator/i).fill("Paul Bernard");
  await pick(screen, "Collection origin *", "Scientific expedition");

  await openTab(screen, "Curation and repository");
  const archive = organizationLabel("02feahw73");
  await screen.getByRole("combobox", { name: "Current archive *" }).click();
  await screen.getByPlaceholder("Search organizations...").fill(archive);
  await screen.getByRole("option", { name: archive }).click();
}

beforeAll(() => page.viewport(1280, 1600));

describe("CreateSamplePage", () => {
  it("should redirect to the new sample's edit page after creation, with a toast", async () => {
    const screen = await renderCreatePage();
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("button", { name: "Save", exact: true }).click();

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
      .element(screen.getByRole("button", { name: "Save", exact: true }))
      .toBeVisible();
    expect(screen.lockCalls).toEqual([]);
  });

  it("should offer the groups the depositor may attach and submit the picked one", async () => {
    const screen = await renderCreatePage();
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen
      .getByRole("combobox", { name: "Groups this sample belongs to" })
      .click();
    await screen.getByRole("option", { name: "Basalt team" }).click();
    await screen.getByRole("button", { name: "Save", exact: true }).click();

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
    await screen.getByRole("tab", { name: "Sample classification" }).click();

    await pickPath(
      screen,
      "Material *",
      "Rock",
      "Metamorphic",
      "Strongly metamorphosed",
      "Gneiss",
    );

    await screen.getByRole("button", { name: "Save", exact: true }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await expect.element(screen.getByLabelText(/name/i)).toHaveValue("Gneiss");
  });

  it("should send a relation added on the create page in the POST body", async () => {
    const screen = await renderCreatePage();
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("tab", { name: "Related URL or document" }).click();
    await screen.getByRole("button", { name: "Add a relation" }).click();
    await screen.getByRole("menuitem", { name: "DOI" }).click();
    const block = screen.getByRole("group", {
      name: "1. DOI Relation",
      exact: true,
    });
    await block.getByRole("combobox", { name: "Relation type" }).click();
    await screen.getByRole("option", { name: "Is cited by" }).click();
    await block
      .getByRole("textbox", { name: "Identifier" })
      .fill("https://doi.org/10.1594/IEDA.100252");
    await block.getByLabelText("Title").fill("Companion dataset");
    await screen.getByRole("button", { name: "Save", exact: true }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    expect(screen.created()).toMatchObject({
      relations: [
        expect.objectContaining({
          relationType: "is_cited_by",
          identifierType: "doi",
          identifier: "https://doi.org/10.1594/IEDA.100252",
          targetTitle: "Companion dataset",
        }),
      ],
    });
  });

  it("should create then publish the sample and return to the list", async () => {
    const screen = await renderCreatePage();
    await fillPublishableSample(screen);

    await screen.getByRole("button", { name: "Publish", exact: true }).click();
    await screen
      .getByRole("dialog", { name: "Publish sample" })
      .getByRole("button", { name: "Confirm" })
      .click();

    await expect
      .element(screen.getByRole("heading", { name: "My samples" }))
      .toBeVisible();
    expect(screen.calls).toEqual(["POST samples", "PUBLISH published"]);
    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Sample published");
  });

  it("should keep Publish disabled until the current user is known", async () => {
    let answerCurrentUser = () => {};
    const screen = await renderCreatePage(
      false,
      false,
      new Promise((resolve) => {
        answerCurrentUser = () => resolve();
      }),
    );
    await fillPublishableSample(screen);

    const publish = screen.getByRole("button", {
      name: "Publish",
      exact: true,
    });
    await expect.element(publish).toBeDisabled();

    answerCurrentUser();

    await expect.element(publish).toBeEnabled();
  });

  it("should land on the new draft's edit page when publishing fails after creation", async () => {
    const screen = await renderCreatePage(false, true);
    await fillPublishableSample(screen);

    await screen.getByRole("button", { name: "Publish", exact: true }).click();
    await screen
      .getByRole("dialog", { name: "Publish sample" })
      .getByRole("button", { name: "Confirm" })
      .click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Could not publish the sample. Please try again.");
  });

  it("should show an error toast when creation fails", async () => {
    const screen = await renderCreatePage(true);
    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox", { name: /nature/i }).click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("button", { name: "Save", exact: true }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Could not create the sample. Please try again.");
  });
});

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
import { fillPersonName } from "../../test/fill-person-name.ts";
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

const PARENT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c33f0";

const OUT_OF_REACH_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c33f1";

const SECOND_PARENT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c33f2";

const SECOND_PARENT_IGSN = "01K072TVWVFK5A1RRZ5MY4PPKA";

const SOURCE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c33f3";

const FORBIDDEN_SOURCE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c33f4";

const OUT_OF_REACH_SOURCE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c33f5";

const PARENT = {
  id: PARENT_ID,
  name: "Massif Central 2026",
  nature: "thin_section",
  type: "dredge",
  material: "rock_and_sediment.mineral",
  materialOtherName: null,
  texture: null,
  metamorphicFacies: null,
  metamorphicFabric: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: "MC-2026-007",
  location: { position: { type: "point", longitude: 3, latitude: 45 } },
  description: {
    openDescription: "Fine grained",
    oriented: true,
    orientationExplanation: "North up",
  },
  condition: null,
  security: null,
  scientificContext: {
    provenanceStatus: "collection_specimen",
    collectionCuratorFirstname: "Paul",
    collectionCuratorLastname: "Bernard",
  },
  age: {
    numericAgeMin: 12,
    numericAgeMax: 12,
    numericAgeUnit: "ma",
    numericAgeYearsUnit: null,
    geologicalAgeMin: null,
    geologicalAgeMax: null,
    geologicalUnit: null,
  },
  repository: null,
  existenceStatus: "exists",
  availabilityStatus: "available",
  publicationYear: 2026,
  resourceType: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  relations: [],
  attachments: [],
  manualGroups: [],
  igsn: IGSN,
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

const SOURCE = {
  ...PARENT,
  id: SOURCE_ID,
  name: "Basalte du Massif Central",
  manualGroups: [BASALT_TEAM],
  parents: [
    {
      id: PARENT_ID,
      igsn: IGSN,
      name: PARENT.name,
      material: PARENT.material,
    },
  ],
};

const OUT_OF_REACH_SOURCE = {
  ...SOURCE,
  id: OUT_OF_REACH_SOURCE_ID,
  parents: [
    {
      id: OUT_OF_REACH_ID,
      igsn: IGSN,
      name: "Sample out of reach",
      material: PARENT.material,
    },
  ],
};

const SECOND_PARENT = {
  ...PARENT,
  id: SECOND_PARENT_ID,
  igsn: SECOND_PARENT_IGSN,
  name: "Vosges 2026",
  specificName: "VG-2026-001",
  description: null,
  scientificContext: null,
  age: null,
};

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
    http.get("*/admin/users/search", () => HttpResponse.json({ data: [] })),
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
  parentId?: string,
  duplicateId?: string,
) {
  const { lockCalls, calls, created } = fakeApi(
    failWrites,
    failPublish,
    currentUserGate,
  );
  worker.use(
    http.get("*/admin/samples/parents/:id", ({ params }) => {
      if (params.id === PARENT_ID) return HttpResponse.json({ data: PARENT });
      if (params.id === SECOND_PARENT_ID)
        return HttpResponse.json({ data: SECOND_PARENT });
      return new HttpResponse(null, { status: 404 });
    }),
  );
  if (duplicateId) {
    worker.use(
      http.get("*/admin/samples/:id", ({ params }) => {
        if (params.id === SOURCE_ID) {
          return HttpResponse.json({
            data: SOURCE,
            role: "owner",
            managed: false,
            manualGroupOptions: [],
          });
        }
        if (params.id === OUT_OF_REACH_SOURCE_ID) {
          return HttpResponse.json({
            data: OUT_OF_REACH_SOURCE,
            role: "owner",
            managed: false,
            manualGroupOptions: [],
          });
        }
        if (params.id === FORBIDDEN_SOURCE_ID) {
          return new HttpResponse(null, { status: 403 });
        }
        return undefined;
      }),
    );
  }
  if (parentId) {
    worker.use(
      http.get("*/admin/samples/parents", () =>
        HttpResponse.json({
          data: [
            {
              id: SECOND_PARENT_ID,
              igsn: SECOND_PARENT_IGSN,
              name: SECOND_PARENT.name,
              material: SECOND_PARENT.material,
            },
          ],
        }),
      ),
    );
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({
      initialEntries: [
        parentId
          ? `/samples/create?parent=${parentId}`
          : duplicateId
            ? `/samples/create?duplicate=${duplicateId}`
            : "/samples/create",
      ],
    }),
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

const continueWithOneParent = (screen: CreateScreen) =>
  screen.getByRole("button", { name: "Continue" }).click();

const continueWithTwoParents = async (screen: CreateScreen) => {
  await screen.getByLabelText("Second parent (optional)").click();
  await screen.getByPlaceholder("Search by name or IGSN").fill("Vosges");
  await screen.getByRole("option", { name: /Vosges 2026/ }).click();
  await continueWithOneParent(screen);
};

async function fillPublishableSample(screen: CreateScreen) {
  await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
  await pick(screen, "Nature *", "Thin section");
  await pick(screen, "Type *", "Dredge");
  await pick(screen, "Provenance status *", "Collection specimen");
  await screen.getByLabelText("Date *", { exact: true }).fill("2025-06-15");

  await openTab(screen, "Sample classification");
  await pick(screen, "Material *", "Synthetic rock / mineral");
  await pick(screen, "Starting material *", "Natural");
  await pick(screen, "Final product *", "Glass");
  await screen.getByLabelText("Date *", { exact: true }).fill("2025-06-15");
  await fillPersonName(screen, "Operator name", "Paul", "Bernard");

  await openTab(screen, "Scientific context");
  await fillPersonName(
    screen,
    "Name of the collection curator",
    "Paul",
    "Bernard",
  );
  await pick(screen, "Collection origin *", "Scientific expedition");
}

beforeAll(() => page.viewport(1280, 1600));

const renderDuplicatePage = (duplicateId: string) =>
  renderCreatePage(false, false, undefined, undefined, duplicateId);

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

  it("should ask for an optional second parent before offering any form", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);

    await expect
      .element(screen.getByRole("dialog", { name: "Add a sub sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByLabelText("First parent"))
      .toHaveValue(`Massif Central 2026 (${IGSN})`);
    await expect
      .element(screen.getByRole("button", { name: "Save", exact: true }))
      .not.toBeInTheDocument();
  });

  it("should create a sub sample carrying the parent id and the location it inherits", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);
    await continueWithOneParent(screen);

    await expect
      .element(
        screen.getByRole("heading", {
          name: "Create sub sample of Massif Central 2026",
        }),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("tab", { name: "Parent sample" }))
      .toBeVisible();
    await screen.getByLabelText(/name/i).fill("Thin section MC-2026-007");
    await screen.getByRole("button", { name: "Save", exact: true }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    expect(screen.created()).toMatchObject({
      name: "Thin section MC-2026-007",
      nature: null,
      parentIds: [PARENT_ID],
      specificName: "MC-2026-007",
      location: { position: { type: "point", longitude: 3, latitude: 45 } },
    });
  });

  it("should force a synthetic material and prefill nothing else when a second parent is picked", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);
    await continueWithTwoParents(screen);

    await expect
      .element(
        screen.getByRole("heading", {
          name: "Create sub sample of Massif Central 2026 and Vosges 2026",
        }),
      )
      .toBeVisible();
    await expect.element(screen.getByLabelText(/name/i)).toHaveValue("");
    await expect
      .element(screen.getByRole("combobox", { name: "Nature *", exact: true }))
      .toHaveTextContent("Select a nature");
    await expect
      .element(screen.getByRole("tab", { name: "Location" }))
      .toBeDisabled();

    await openTab(screen, "Sample classification");
    await expect
      .element(screen.getByText("Synthetic rock / mineral"))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("button", { name: "Remove Synthetic rock / mineral" }),
      )
      .not.toBeInTheDocument();
  });

  it("should fill a field from a parent's suggestion and submit both parent ids", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);
    await continueWithTwoParents(screen);

    await screen.getByLabelText(/name/i).fill("Synthetic MC x VG");
    await openTab(screen, "Sample classification");
    await expect
      .element(
        screen.getByRole("button", {
          name: "Massif Central 2026: MC-2026-007",
        }),
      )
      .toBeVisible();
    await screen
      .getByRole("button", { name: "Vosges 2026: VG-2026-001" })
      .click();

    await expect
      .element(screen.getByLabelText("Specific Name"))
      .toHaveValue("VG-2026-001");

    await screen.getByRole("button", { name: "Save", exact: true }).click();

    await expect
      .element(screen.getByRole("heading", { name: "Edit sample" }))
      .toBeVisible();
    expect(screen.created()).toMatchObject({
      parentIds: [PARENT_ID, SECOND_PARENT_ID],
      material: "rock_and_sediment.synthetic_rock_mineral",
      specificName: "VG-2026-001",
      location: null,
    });
  });

  it("should offer a yes/no chip for a parent's switch and a disabled slot for the parent with no value", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);
    await continueWithTwoParents(screen);
    await openTab(screen, "Physical description");

    const orientedSlots = screen
      .getByRole("list", { name: "Values from the parent samples" })
      .filter({ hasText: "Yes" });
    await expect
      .element(
        orientedSlots.getByRole("button", { name: "Massif Central 2026: Yes" }),
      )
      .toBeVisible();
    await expect
      .element(
        orientedSlots.getByRole("button", { name: "Vosges 2026: No value" }),
      )
      .toBeDisabled();
  });

  it("should hide a gated row until its own gate chip opens it, then fill it without touching the gate", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);
    await continueWithTwoParents(screen);
    await openTab(screen, "Physical description");

    await expect
      .element(
        screen.getByRole("button", { name: "Massif Central 2026: North up" }),
      )
      .not.toBeInTheDocument();

    await screen
      .getByRole("button", { name: "Massif Central 2026: Yes" })
      .click();
    await screen
      .getByRole("button", { name: "Massif Central 2026: North up" })
      .click();

    await expect
      .element(screen.getByLabelText("Orientation explanation"))
      .toHaveValue("North up");
    await expect
      .element(screen.getByRole("switch", { name: "Oriented sample" }))
      .toBeChecked();
  });

  it("should open the numeric age section with the parent's suggestion", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);
    await continueWithTwoParents(screen);
    await openTab(screen, "Age");

    await expect
      .element(screen.getByRole("switch", { name: "Record a numeric age" }))
      .toBeChecked();
    await expect
      .element(screen.getByRole("button", { name: "Massif Central 2026: 12" }))
      .toBeVisible();
  });

  it("should offer no suggestion slot when the sub sample has a single parent", async () => {
    const screen = await renderCreatePage(false, false, undefined, PARENT_ID);
    await continueWithOneParent(screen);
    await openTab(screen, "Physical description");

    await expect
      .element(
        screen.getByRole("list", { name: "Values from the parent samples" }),
      )
      .not.toBeInTheDocument();
  });

  it("should render the plain create form when the parent is out of reach", async () => {
    const screen = await renderCreatePage(
      false,
      false,
      undefined,
      OUT_OF_REACH_ID,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Create sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("tab", { name: "Parent sample" }))
      .not.toBeInTheDocument();
  });

  it("should prefill the form from the duplicated sample without asking for a second parent", async () => {
    const screen = await renderDuplicatePage(SOURCE_ID);

    await expect
      .element(
        screen.getByRole("heading", {
          name: "Duplicate Basalte du Massif Central",
        }),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("dialog", { name: "Add a sub sample" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/name/i))
      .toHaveValue("Basalte du Massif Central (copy)");
    await expect
      .element(screen.getByRole("combobox", { name: "Nature *", exact: true }))
      .toHaveTextContent("Thin section");
    await expect
      .element(screen.getByRole("button", { name: "Detach Basalt team" }))
      .toBeVisible();

    await openTab(screen, "Parent sample");
    await expect.element(screen.getByText("Massif Central 2026")).toBeVisible();
  });

  it("should drop a copied parent the duplicator may declare no sub sample of", async () => {
    const screen = await renderDuplicatePage(OUT_OF_REACH_SOURCE_ID);

    await expect
      .element(screen.getByLabelText(/name/i))
      .toHaveValue("Basalte du Massif Central (copy)");
    await expect
      .element(screen.getByRole("tab", { name: "Parent sample" }))
      .not.toBeInTheDocument();
  });

  it("should refuse to duplicate a sample out of reach", async () => {
    const screen = await renderDuplicatePage(FORBIDDEN_SOURCE_ID);

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("You do not have access to this sample.");
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

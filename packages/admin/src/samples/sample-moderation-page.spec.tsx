import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { addFilter } from "../../test/add-filter.ts";
import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { fakeSample } from "../../test/fake-sample.ts";
import { worker } from "../../test/msw.ts";
import { pickPath } from "../../test/pick-hierarchy.ts";
import { renderRoute } from "../../test/render-route.tsx";

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

const MODERATED = [
  {
    ...fakeSample,
    id: "3f2504e0-4f89-41d3-9a0c-030500000001",
    name: "Sample of Jean",
    owner: { name: "Martin", firstname: "Jean", status: "accepted" },
  },
  {
    ...fakeSample,
    id: "3f2504e0-4f89-41d3-9a0c-030500000002",
    name: "Sample of Hugo",
    owner: { name: "Fournier", firstname: "Hugo", status: "pending" },
  },
];

const JAMES = {
  id: "3f2504e0-4f89-41d3-9a0c-030500000010",
  email: "james@hutton.example",
  name: "Hutton",
  firstname: "James",
  orcid: null,
};

const OFF_PAGE_GROUP = {
  id: "3f2504e0-4f89-41d3-9a0c-030500000020",
  name: "Basalt survey",
};

function fakeApi() {
  const requested: string[] = [];
  worker.use(
    http.get("*/admin/samples/moderated", ({ request }) => {
      requested.push(new URL(request.url).search);
      return HttpResponse.json({
        data: MODERATED,
        meta: { total: MODERATED.length },
      });
    }),
    http.get("*/admin/samples", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get("*/admin/manual-groups", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.get("*/admin/users/search", () =>
      HttpResponse.json({ data: [JAMES] }),
    ),
  );
  return { requested };
}

beforeAll(() => page.viewport(1280, 1600));

type Screen = Awaited<ReturnType<typeof renderRoute>>["screen"];

describe("SampleModerationPage", () => {
  it("should list the moderated samples with each owner's account status", async () => {
    fakeCurrentUser({ managedLaboratories: ["UMR7359"] });
    fakeApi();

    const { screen } = await renderRoute("/samples/moderation");

    await expect
      .element(screen.getByRole("heading", { name: "Sample moderation" }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("cell", { name: "Sample of Jean", exact: true }),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: /Jean Martin\s*Active/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: /Hugo Fournier\s*Pending/ }))
      .toBeVisible();
  });

  it("should drop the researcher name once the url no longer carries the owner", async () => {
    fakeCurrentUser({ managedLaboratories: ["UMR7359"] });
    fakeApi();

    const { screen, router } = await renderRoute("/samples/moderation");
    const researcher = screen.getByRole("combobox", { name: "Researcher" });
    await researcher.click();
    await screen.getByPlaceholder("Search by name or email").fill("Hut");
    await screen.getByRole("option", { name: /James Hutton/ }).click();
    await expect.element(researcher).toHaveTextContent("James Hutton");

    router.history.back();

    await expect.element(researcher).toHaveTextContent("Any researcher");
  });

  it("should name the researcher the url carries on a cold load", async () => {
    fakeCurrentUser({ managedLaboratories: ["UMR7359"] });
    fakeApi();

    const { screen } = await renderRoute(
      `/samples/moderation?ownerId=${JAMES.id}`,
    );

    await expect
      .element(screen.getByRole("combobox", { name: "Researcher" }))
      .toHaveTextContent("James Hutton");
  });

  it("should name the picked manual group the catalog page does not carry", async () => {
    fakeCurrentUser({ managedLaboratories: ["UMR7359"] });
    fakeApi();
    worker.use(
      http.get(`*/admin/manual-groups/${OFF_PAGE_GROUP.id}`, () =>
        HttpResponse.json({ data: OFF_PAGE_GROUP }),
      ),
    );

    const { screen } = await renderRoute(
      `/samples/moderation?manualGroup=${OFF_PAGE_GROUP.id}`,
    );

    await expect
      .element(screen.getByRole("combobox", { name: "Manual group" }))
      .toHaveTextContent("Basalt survey");
  });

  it.each<[string, (screen: Screen) => Promise<void>, string, object]>([
    [
      "institution",
      async (screen) => {
        await screen.getByRole("combobox", { name: "Institution" }).click();
        await screen
          .getByLabelText("Search institutions")
          .fill("GéoRessources");
        await screen
          .getByRole("button", { name: "GéoRessources (GEORESSOURCES)" })
          .first()
          .click();
      },
      "institution=laboratory%3AUMR7359",
      { institution: "laboratory:UMR7359" },
    ],
    [
      "collector name",
      async (screen) => {
        await addFilter(screen, "Collector name");
        await screen
          .getByRole("searchbox", { name: "Collector name", exact: true })
          .fill("Curie");
      },
      "collectorName=Curie",
      { collectorName: "Curie" },
    ],
    [
      "existence status",
      async (screen) => {
        await addFilter(screen, "Existence status");
        await pickPath(screen, "Existence status", "Destroyed");
      },
      "existenceStatus=destroyed",
      { existenceStatus: "destroyed" },
    ],
    [
      "availability status",
      async (screen) => {
        await addFilter(screen, "Availability status");
        await pickPath(screen, "Availability status", "Restricted");
      },
      "availabilityStatus=restricted",
      { availabilityStatus: "restricted" },
    ],
  ])(
    "should ask the server for the chosen %s, keep it in the URL and reset to page 1",
    async (_, act, query, expected) => {
      fakeCurrentUser({ managedLaboratories: ["UMR7359"] });
      const { requested } = fakeApi();

      const { screen, router } = await renderRoute(
        "/samples/moderation?page=2",
      );
      await expect
        .element(
          screen.getByRole("cell", { name: "Sample of Jean", exact: true }),
        )
        .toBeVisible();

      await act(screen);

      await expect.poll(() => requested.at(-1)).toContain(query);
      await expect
        .poll(() => router.state.location.search)
        .toMatchObject({ page: 1, ...expected });
    },
  );

  it("should send a plain researcher back to their own samples", async () => {
    fakeCurrentUser();
    fakeApi();

    const { screen } = await renderRoute("/samples/moderation");

    await expect
      .element(screen.getByRole("heading", { name: "My samples" }))
      .toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Sample moderation" }).elements(),
    ).toHaveLength(0);
  });
});

import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { User } from "@projet-igsn/domain/user/model";

import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { ShareSampleButton } from "./share-sample-button.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: { access_token: "tok", profile: { name: "Marie Dupont" } },
  }),
}));

const SAMPLE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const sample = {
  id: SAMPLE_ID,
  name: "Basalte du Massif Central",
  nature: "thin_section",
  type: null,
  material: null,
  texture: null,
  metamorphicFacies: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: null,
  location: null,
  description: null,
  condition: null,
  security: null,
  scientificContext: null,
  availability: null,
  age: null,
  links: [],
  attachments: [],
  publicationYear: null,
  economicInterest: null,
  economicInterestElements: [],
  economicResourceTypePrecision: null,
  economicDepositName: null,
  economicDepositDescription: null,
  igsn: null,
  published: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

const curie: User = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3401",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
};
const dupont: User = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3402",
  email: "pierre.dupont@univ-lorraine.fr",
  name: "Dupont",
  firstname: "Pierre",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

function fakeApi({
  role = "owner" as UserSampleRole,
  contributors = [] as User[],
  directory = [] as User[],
} = {}) {
  let listed = [...contributors];
  const calls: string[] = [];
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/contributors")) {
      if (init?.method === "POST" && typeof init.body === "string") {
        const { userId } = JSON.parse(init.body) as { userId: string };
        const picked = directory.find((user) => user.id === userId);
        if (picked && !listed.some((user) => user.id === picked.id)) {
          listed = [...listed, picked];
        }
        return new Response(null, { status: 204 });
      }
      return json({ data: listed });
    }
    if (url.includes("admin/users")) {
      const search = (
        new URL(url).searchParams.get("search") ?? ""
      ).toLowerCase();
      return json({
        data: directory.filter((user) =>
          user.name?.toLowerCase().includes(search),
        ),
      });
    }
    return json({ data: sample, role });
  });
  return { calls };
}

async function renderShareButton(options?: Parameters<typeof fakeApi>[0]) {
  const { calls } = fakeApi(options);
  const queryClient = new QueryClient();
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <ShareSampleButton sampleId={SAMPLE_ID} />
      <Toaster />
    </QueryClientProvider>,
  );
  const userSearches = () =>
    calls.filter((call) => call.includes("admin/users"));
  const filteredSearches = () =>
    userSearches().filter((call) => call.includes("search="));
  const contributorPosts = () =>
    calls.filter((call) => call.startsWith("POST"));
  const roleLoaded = () =>
    vi.waitFor(() =>
      expect(queryClient.getQueryState(["samples", SAMPLE_ID])?.status).toBe(
        "success",
      ),
    );
  return {
    screen,
    calls,
    userSearches,
    filteredSearches,
    contributorPosts,
    roleLoaded,
  };
}

type Screen = Awaited<ReturnType<typeof render>>;

const searchField = (screen: Screen) =>
  screen.getByRole("combobox", { name: "Search a colleague" });

const collaborators = (screen: Screen) =>
  screen.getByRole("dialog").getByRole("listitem");

describe("ShareSampleButton", () => {
  it("should list the current collaborators when the owner opens it", async () => {
    const { screen } = await renderShareButton({ contributors: [curie] });

    await screen.getByRole("button", { name: "Share" }).click();

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent("Share this sample");
    await expect
      .element(screen.getByText("marie.curie@univ-lorraine.fr"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("listbox", { name: "Matching colleagues" }))
      .toBeInTheDocument();
  });

  it("should show an empty state when nobody collaborates yet", async () => {
    const { screen } = await renderShareButton();

    await screen.getByRole("button", { name: "Share" }).click();

    await expect.element(screen.getByText("No collaborator yet")).toBeVisible();
  });

  it("should add the picked colleague to the collaborator list", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await screen.getByRole("button", { name: "Share" }).click();

    await searchField(screen).fill("dup");
    await screen.getByRole("option", { name: /Dupont/ }).click();

    await expect
      .element(collaborators(screen))
      .toHaveTextContent("Pierre Dupont pierre.dupont@univ-lorraine.fr");
    await expect.element(screen.getByText("Collaborator added")).toBeVisible();
  });

  it("should leave the list unchanged when picking an already listed colleague", async () => {
    const { screen, contributorPosts } = await renderShareButton({
      contributors: [dupont],
      directory: [dupont],
    });
    await screen.getByRole("button", { name: "Share" }).click();

    await searchField(screen).fill("dup");
    await screen.getByRole("option", { name: /Dupont/ }).click();
    await vi.waitFor(() => expect(contributorPosts()).toHaveLength(1));

    await expect
      .element(collaborators(screen))
      .toHaveTextContent("Pierre Dupont pierre.dupont@univ-lorraine.fr");
    expect(collaborators(screen).elements()).toHaveLength(1);
    expect(
      screen
        .getByText("Could not add the collaborator. Please try again.")
        .query(),
    ).toBeNull();
  });

  it("should list the colleagues on open, before anything is typed", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont, curie],
    });

    await screen.getByRole("button", { name: "Share" }).click();

    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("option", { name: /Curie/ }))
      .toBeVisible();
    expect(filteredSearches()).toEqual([]);
  });

  it("should not filter on a term shorter than two characters", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont],
    });
    await screen.getByRole("button", { name: "Share" }).click();

    await searchField(screen).fill("d");

    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    expect(screen.getByText("No colleague found").query()).toBeNull();
    expect(filteredSearches()).toEqual([]);
  });

  it("should say so when no colleague matches a typed term", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await screen.getByRole("button", { name: "Share" }).click();

    await searchField(screen).fill("zzz");

    await expect.element(screen.getByText("No colleague found")).toBeVisible();
  });

  it("should debounce the search instead of querying on each keystroke", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont],
    });
    await screen.getByRole("button", { name: "Share" }).click();
    const field = searchField(screen);

    await field.fill("du");
    await field.fill("dup");
    await field.fill("dupo");

    await vi.waitFor(() =>
      expect(filteredSearches().at(-1)).toContain("search=dupo"),
    );
    expect(filteredSearches()).toHaveLength(1);
  });

  it("should render nothing for a contributor", async () => {
    const { screen, roleLoaded } = await renderShareButton({
      role: "contributor",
    });

    await roleLoaded();

    expect(screen.getByRole("button", { name: "Share" }).elements()).toEqual(
      [],
    );
  });
});

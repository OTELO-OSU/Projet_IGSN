import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { User } from "@projet-igsn/domain/user/model";

import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import { fakeSample } from "../../test/fake-sample.ts";
import { worker } from "../../test/msw.ts";
import { ShareSampleButton } from "./share-sample-button.tsx";

const { OWNER_EMAIL } = vi.hoisted(() => ({
  OWNER_EMAIL: "marie.dupont@univ-lorraine.fr",
}));

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      access_token: "tok",
      profile: {
        name: "Marie Dupont",
        given_name: "Marie",
        family_name: "Dupont",
        email: OWNER_EMAIL,
      },
    },
  }),
}));

const SAMPLE_ID = fakeSample.id;

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

function fakeApi({
  role = "owner" as UserSampleRole,
  contributors = [] as User[],
  directory = [] as User[],
} = {}) {
  let listed = [...contributors];
  const calls: string[] = [];
  worker.use(
    http.get("*/samples/:id/contributors", ({ request }) => {
      calls.push(`GET ${request.url}`);
      return HttpResponse.json({ data: listed });
    }),
    http.post("*/samples/:id/contributors", async ({ request }) => {
      calls.push(`POST ${request.url}`);
      const { userId } = (await request.json()) as { userId: string };
      const picked = directory.find((user) => user.id === userId);
      if (picked && !listed.some((user) => user.id === picked.id)) {
        listed = [...listed, picked];
      }
      return new HttpResponse(null, { status: 204 });
    }),
    http.get("*/admin/users", ({ request }) => {
      calls.push(`GET ${request.url}`);
      const search = (
        new URL(request.url).searchParams.get("search") ?? ""
      ).toLowerCase();
      return HttpResponse.json({
        data: directory.filter((user) =>
          user.name?.toLowerCase().includes(search),
        ),
      });
    }),
    http.get("*/samples/:id", () =>
      HttpResponse.json({ data: fakeSample, role }),
    ),
  );
  return { calls };
}

async function renderShareButton(options?: Parameters<typeof fakeApi>[0]) {
  const { calls } = fakeApi(options);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
  screen.getByRole("combobox", { name: "Search by name or email" });

const collaborators = (screen: Screen) =>
  screen.getByRole("dialog").getByRole("listitem");

const openDialog = (screen: Screen) =>
  screen.getByRole("button", { name: "Share" }).click();

const openPicker = async (screen: Screen) => {
  await openDialog(screen);
  await screen.getByRole("combobox", { name: "Search a colleague" }).click();
};

describe("ShareSampleButton", () => {
  it("should show the sample owner first", async () => {
    const { screen } = await renderShareButton();

    await openDialog(screen);

    await expect
      .element(screen.getByRole("heading", { name: "Owner" }))
      .toBeVisible();
    await expect
      .element(screen.getByText(`Marie Dupont ${OWNER_EMAIL}`))
      .toBeVisible();
  });

  it("should list the current collaborators under their own label", async () => {
    const { screen } = await renderShareButton({ contributors: [curie] });

    await openDialog(screen);

    await expect
      .element(screen.getByRole("dialog"))
      .toHaveTextContent("Share this sample");
    await expect
      .element(screen.getByRole("heading", { name: "Collaborators" }))
      .toBeVisible();
    await expect
      .element(screen.getByText("marie.curie@univ-lorraine.fr"))
      .toBeVisible();
  });

  it("should show an empty state when nobody collaborates yet", async () => {
    const { screen } = await renderShareButton();

    await openDialog(screen);

    await expect.element(screen.getByText("No collaborator yet")).toBeVisible();
  });

  it("should offer no suggestion until the autocomplete is opened", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });

    await openDialog(screen);

    await expect
      .element(screen.getByRole("combobox", { name: "Search a colleague" }))
      .toBeVisible();
    expect(screen.getByRole("option").elements()).toEqual([]);
    expect(screen.getByRole("listbox").elements()).toEqual([]);
  });

  it("should add the picked colleague to the collaborator list", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await openPicker(screen);

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
    await openPicker(screen);

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

  it("should list the colleagues on opening the autocomplete, before anything is typed", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont, curie],
    });

    await openPicker(screen);

    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("option", { name: /Curie/ }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("listbox", { name: "Matching colleagues" }))
      .toBeInTheDocument();
    expect(filteredSearches()).toEqual([]);
  });

  it("should not filter on a term shorter than two characters", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont],
    });
    await openPicker(screen);

    await searchField(screen).fill("d");

    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    expect(screen.getByText("No colleague found").query()).toBeNull();
    expect(filteredSearches()).toEqual([]);
  });

  it("should say so when no colleague matches a typed term", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await openPicker(screen);

    await searchField(screen).fill("zzz");

    await expect.element(screen.getByText("No colleague found")).toBeVisible();
  });

  it("should debounce the search instead of querying on each keystroke", async () => {
    const { screen, filteredSearches } = await renderShareButton({
      directory: [dupont],
    });
    await openPicker(screen);
    const field = searchField(screen);

    await field.fill("du");
    await field.fill("dup");
    await field.fill("dupo");

    await vi.waitFor(() =>
      expect(filteredSearches().at(-1)).toContain("search=dupo"),
    );
    expect(filteredSearches()).toHaveLength(1);
  });

  it("should let a keyboard user open the autocomplete and add a colleague", async () => {
    const { screen } = await renderShareButton({ directory: [dupont] });
    await openDialog(screen);

    screen
      .getByRole("combobox", { name: "Search a colleague" })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("option", { name: /Dupont/ }))
      .toBeVisible();
    await userEvent.keyboard("{Enter}");

    await expect
      .element(collaborators(screen))
      .toHaveTextContent("Pierre Dupont");
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

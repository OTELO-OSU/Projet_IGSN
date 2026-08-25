import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { fakeSample } from "../../test/fake-sample.ts";
import { worker } from "../../test/msw.ts";
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

const listSample = (index: number, ownership: "mine" | "shared") => ({
  ...fakeSample,
  id: `3f2504e0-4f89-41d3-9a0c-0305000000${String(index).padStart(2, "0")}`,
  owner: { name: "Curie", firstname: "Marie", status: "accepted" },
  name: `Sample ${index} ${ownership}`,
});

const SAMPLES = [
  ...Array.from({ length: 11 }, (_, i) => listSample(i + 1, "mine")),
  listSample(12, "shared"),
];

function fakeApi() {
  const requested: string[] = [];
  fakeCurrentUser();
  worker.use(
    http.get("*/admin/samples", ({ request }) => {
      const url = new URL(request.url);
      requested.push(url.search);
      const ownership = url.searchParams.get("ownership");
      const perPage = Number(url.searchParams.get("perPage") ?? "25");
      const page = Number(url.searchParams.get("page") ?? "1");
      const matching = ownership
        ? SAMPLES.filter((sample) => sample.name.endsWith(ownership))
        : SAMPLES;
      return HttpResponse.json({
        data: matching.slice((page - 1) * perPage, page * perPage),
        meta: { total: matching.length },
      });
    }),
  );
  return { requested };
}

type Screen = Awaited<ReturnType<typeof renderRoute>>["screen"];

describe("SampleListPage", () => {
  it("should ask the server for the chosen ownership and reset to page 1", async () => {
    const { requested } = fakeApi();
    const { screen, router } = await renderRoute(
      "/?page=2&perPage=10&sort=status&order=desc&search=Sample",
    );

    await expect
      .element(screen.getByRole("cell", { name: "Sample 11 mine" }))
      .toBeVisible();

    await screen.getByRole("combobox", { name: "Ownership" }).click();
    await screen.getByRole("option", { name: "Shared with me" }).click();

    await expect
      .element(screen.getByRole("cell", { name: "Sample 12 shared" }))
      .toBeVisible();
    expect(requested.at(-1)).toContain("ownership=shared");
    await expect
      .poll(() => router.state.location.search)
      .toMatchObject({
        page: 1,
        ownership: "shared",
        search: "Sample",
        sort: "status",
        order: "desc",
      });
  });

  it("should restore the ownership filter from the URL", async () => {
    const { requested } = fakeApi();

    const { screen } = await renderRoute("/?ownership=shared");

    await expect
      .element(screen.getByRole("cell", { name: "Sample 12 shared" }))
      .toBeVisible();
    expect(
      screen.getByRole("cell", { name: "Sample 1 mine" }).elements(),
    ).toHaveLength(0);
    expect(requested.at(-1)).toContain("ownership=shared");
  });

  it.each<[string, (screen: Screen) => Promise<void>]>([
    [
      "paging",
      (screen) => screen.getByRole("button", { name: "Next" }).click(),
    ],
    [
      "the page size",
      async (screen) => {
        await screen.getByRole("combobox", { name: "Rows per page" }).click();
        await screen.getByRole("option", { name: "25" }).click();
      },
    ],
    [
      "the sort",
      (screen) => screen.getByRole("button", { name: "Status" }).click(),
    ],
  ])("should keep the ownership filter when changing %s", async (_, act) => {
    const { requested } = fakeApi();
    const { screen } = await renderRoute("/?ownership=mine&perPage=10");

    await expect
      .element(screen.getByRole("cell", { name: "Sample 1 mine" }))
      .toBeVisible();

    await act(screen);

    await expect.poll(() => requested.at(-1)).toContain("ownership=mine");
  });
});

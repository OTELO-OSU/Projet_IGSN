import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

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

const SAMPLES = Array.from({ length: 12 }, (_, i) => ({
  ...fakeSample,
  owner: null,
  id: `3f2504e0-4f89-41d3-9a0c-0305000000${String(i + 1).padStart(2, "0")}`,
  name: `Sample ${i + 1}`,
}));

const EXPORT_FILENAME = "igsn-samples-export-2026-09-28.xlsx";

function fakeApi(exportResponse = () => exportFile()) {
  const posted: unknown[] = [];
  fakeCurrentUser({ managedLaboratories: ["UMR7359"] });
  const list = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("perPage") ?? "25");
    const pageNumber = Number(url.searchParams.get("page") ?? "1");
    return HttpResponse.json({
      data: SAMPLES.slice((pageNumber - 1) * perPage, pageNumber * perPage),
      meta: { total: SAMPLES.length },
    });
  };
  worker.use(
    http.get("*/admin/samples", list),
    http.get("*/admin/samples/moderated", list),
    http.get("*/admin/currentUser/manual-groups", () =>
      HttpResponse.json({ data: [] }),
    ),
    http.get("*/admin/manual-groups", () =>
      HttpResponse.json({ data: [], meta: { total: 0 } }),
    ),
    http.post("*/admin/samples/export", async ({ request }) => {
      posted.push(await request.json());
      return exportResponse();
    }),
  );
  return { posted };
}

const exportFile = () =>
  new HttpResponse("xlsx-bytes", {
    headers: {
      "Content-Disposition": `attachment; filename="${EXPORT_FILENAME}"`,
    },
  });

function captureSavedFiles() {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  const savedNames: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      savedNames.push(this.download);
    },
  );
  return savedNames;
}

type Screen = Awaited<ReturnType<typeof renderRoute>>["screen"];

const checkbox = (screen: Screen, name: string) =>
  screen.getByRole("checkbox", { name: `Select ${name}`, exact: true });

const check = (screen: Screen, name: string) => checkbox(screen, name).click();

const bar = (screen: Screen) =>
  screen.getByRole("region", { name: "Bulk actions" });

const LIST_FILTERS = [
  [
    "my samples",
    "/?perPage=10&page=1&sort=status&order=desc&ownership=mine",
    false,
    { ownership: "mine" },
  ],
  [
    "the moderation list",
    "/samples/moderation?perPage=10&status=published",
    true,
    { status: "published" },
  ],
] as const;

beforeAll(() => page.viewport(1280, 1600));

describe("SampleBulkActionBar", () => {
  it("should appear once a sample is checked, counting the checked samples", async () => {
    fakeApi();
    const { screen } = await renderRoute("/?perPage=10");
    await expect
      .element(screen.getByRole("cell", { name: "Sample 1", exact: true }))
      .toBeVisible();
    expect(bar(screen).elements()).toHaveLength(0);

    await check(screen, "Sample 1");

    await expect.element(bar(screen)).toHaveTextContent("1 selected");
  });

  it("should export the checked samples by id under the api's file name", async () => {
    const { posted } = fakeApi();
    const savedNames = captureSavedFiles();
    const { screen } = await renderRoute("/?perPage=10");
    await check(screen, "Sample 1");
    await check(screen, "Sample 2");

    await bar(screen).getByRole("button", { name: "Export" }).click();

    await expect.poll(() => savedNames).toEqual([EXPORT_FILENAME]);
    expect(posted).toEqual([
      { mode: "ids", moderated: false, ids: [SAMPLES[0]!.id, SAMPLES[1]!.id] },
    ]);
  });

  it("should export the checked samples from the Bulk edit dialog", async () => {
    const { posted } = fakeApi();
    const savedNames = captureSavedFiles();
    const { screen } = await renderRoute("/?perPage=10");
    await check(screen, "Sample 1");

    await screen.getByRole("button", { name: "Bulk edit" }).click();
    await screen
      .getByRole("dialog", { name: "Bulk edit" })
      .getByRole("button", { name: "Export samples" })
      .click();

    await expect.poll(() => savedNames).toEqual([EXPORT_FILENAME]);
    expect(posted).toEqual([
      { mode: "ids", moderated: false, ids: [SAMPLES[0]!.id] },
    ]);
  });

  it.each(LIST_FILTERS)(
    "should export every sample matching the filters of %s after Select all",
    async (_, url, moderated, query) => {
      const { posted } = fakeApi();
      captureSavedFiles();
      const { screen } = await renderRoute(url);
      await check(screen, "Sample 1");

      await bar(screen).getByRole("button", { name: "Select all" }).click();
      await expect.element(bar(screen)).toHaveTextContent("12 selected");
      await bar(screen).getByRole("button", { name: "Export" }).click();

      await expect
        .poll(() => posted)
        .toEqual([{ mode: "filters", moderated, query }]);
    },
  );

  it.each(LIST_FILTERS)(
    "should export every sample matching the filters of %s from the Bulk edit dialog when nothing is checked",
    async (_, url, moderated, query) => {
      const { posted } = fakeApi();
      captureSavedFiles();
      const { screen } = await renderRoute(url);
      await expect
        .element(screen.getByRole("cell", { name: "Sample 1", exact: true }))
        .toBeVisible();

      await screen.getByRole("button", { name: "Bulk edit" }).click();
      await screen
        .getByRole("dialog", { name: "Bulk edit" })
        .getByRole("button", { name: "Export samples" })
        .click();

      await expect
        .poll(() => posted)
        .toEqual([{ mode: "filters", moderated, query }]);
    },
  );

  it("should hide once the selection is cleared", async () => {
    fakeApi();
    const { screen } = await renderRoute("/?perPage=10");
    await check(screen, "Sample 1");

    await bar(screen).getByRole("button", { name: "Clear selection" }).click();

    await expect.element(bar(screen)).not.toBeInTheDocument();
    await expect.element(checkbox(screen, "Sample 1")).not.toBeChecked();
  });

  it("should reset the selection when the list page changes", async () => {
    fakeApi();
    const { screen } = await renderRoute("/?perPage=10");
    await check(screen, "Sample 1");
    await expect.element(bar(screen)).toBeVisible();

    await screen.getByRole("button", { name: "Next" }).click();

    await expect
      .element(screen.getByRole("cell", { name: "Sample 11", exact: true }))
      .toBeVisible();
    await expect.element(bar(screen)).not.toBeInTheDocument();
  });

  it.each([
    [422, "Too many samples to export: narrow the selection."],
    [500, "The samples could not be exported."],
  ])(
    "should tell the user when the api answers %i",
    async (status, message) => {
      fakeApi(() => new HttpResponse(null, { status }));
      const { screen } = await renderRoute("/?perPage=10");
      await check(screen, "Sample 1");

      await bar(screen).getByRole("button", { name: "Export" }).click();

      await expect
        .element(screen.getByRole("region", { name: /notifications/i }))
        .toHaveTextContent(message);
    },
  );
});

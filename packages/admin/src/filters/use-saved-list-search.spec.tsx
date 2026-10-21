import {
  ADMIN_PAGE_SIZES,
  pageSchema,
  pageSizeSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { z } from "zod";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { useSavedListSearch } from "./use-saved-list-search.ts";

const USER_ID = "3f2504e0-4f89-41d3-9a0c-0305000000f1";
const OTHER_USER_ID = "3f2504e0-4f89-41d3-9a0c-0305000000f2";
const KEY = `admin-list-samples-${USER_ID}`;

const searchSchema = z.object({
  page: pageSchema,
  perPage: pageSizeSchema(25, ADMIN_PAGE_SIZES),
  sort: z.enum(["igsn", "status"]).optional().catch(undefined),
  status: z.enum(["draft", "published"]).optional().catch(undefined),
});

async function renderList(url: string) {
  const seen: unknown[] = [];
  const rootRoute = createRootRoute();
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/list",
    validateSearch: searchSchema,
    component: function List() {
      const { isRestoring, reset } = useSavedListSearch(
        "samples",
        searchSchema,
      );
      const search = listRoute.useSearch();
      const navigate = useNavigate();
      if (isRestoring) return null;
      seen.push(search);
      return (
        <>
          <output>{JSON.stringify(search)}</output>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: ".",
                search: (prev: Record<string, unknown>) => ({
                  ...prev,
                  status: undefined,
                }),
              })
            }
          >
            Clear
          </button>
          {reset ? (
            <button type="button" onClick={() => void reset()}>
              Reset
            </button>
          ) : null}
        </>
      );
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([listRoute]),
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  const screen = await render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { screen, router, seen };
}

const stored = () => {
  const raw = localStorage.getItem(KEY);
  return raw === null ? null : (JSON.parse(raw) as unknown);
};

describe("useSavedListSearch", () => {
  beforeEach(() => {
    fakeCurrentUser();
  });

  it("should restore the stored state at page 1 on a bare entry, never rendering the bare one", async () => {
    localStorage.setItem(KEY, JSON.stringify({ perPage: 50, status: "draft" }));

    const { screen, router, seen } = await renderList(
      "/list?page=3&perPage=25",
    );

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent('{"page":1,"perPage":50,"status":"draft"}');
    expect(router.state.location.search).toEqual({
      page: 1,
      perPage: 50,
      status: "draft",
    });
    expect(seen).toEqual(
      seen.map(() => ({ page: 1, perPage: 50, status: "draft" })),
    );
  });

  it("should keep a non-bare entry URL and save it over the stored state", async () => {
    localStorage.setItem(KEY, JSON.stringify({ perPage: 50, status: "draft" }));

    const { router } = await renderList("/list?status=published&sort=igsn");

    await expect
      .poll(stored)
      .toEqual({ perPage: 25, sort: "igsn", status: "published" });
    expect(router.state.location.search).toEqual({
      page: 1,
      perPage: 25,
      sort: "igsn",
      status: "published",
    });
  });

  it("should never store the page", async () => {
    await renderList("/list?page=4&status=draft");

    await expect.poll(stored).toEqual({ perPage: 25, status: "draft" });
  });

  it("should not restore the state of another list or another user", async () => {
    localStorage.setItem(
      `admin-list-moderation-${USER_ID}`,
      JSON.stringify({ perPage: 25, status: "draft" }),
    );
    localStorage.setItem(
      `admin-list-samples-${OTHER_USER_ID}`,
      JSON.stringify({ perPage: 25, status: "draft" }),
    );

    const { screen } = await renderList("/list");

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent('{"page":1,"perPage":25}');
  });

  it.each([
    ["corrupt JSON", () => localStorage.setItem(KEY, "{not json")],
    [
      "a schema-rejected value",
      () =>
        localStorage.setItem(
          KEY,
          JSON.stringify({ perPage: 25, status: "bogus" }),
        ),
    ],
    [
      "a throwing storage",
      () =>
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
          throw new Error("blocked");
        }),
    ],
  ])("should keep the defaults on %s", async (_, arrange) => {
    arrange();

    const { screen } = await renderList("/list");

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent('{"page":1,"perPage":25}');
    vi.restoreAllMocks();
    expect(stored()).toBeNull();
  });

  it("should not restore once the last filter is cleared after entry", async () => {
    const { screen } = await renderList("/list?status=draft");
    await expect.poll(stored).toEqual({ perPage: 25, status: "draft" });

    await screen.getByRole("button", { name: "Clear" }).click();

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent('{"page":1,"perPage":25}');
    await expect.poll(stored).toBeNull();
  });

  it("should reset to page 1 clearing the filters but keeping the sort and page size", async () => {
    const { screen, router } = await renderList(
      "/list?page=2&perPage=50&sort=igsn&status=draft",
    );

    await screen.getByRole("button", { name: "Reset" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Reset" }))
      .not.toBeInTheDocument();
    expect(router.state.location.search).toEqual({
      page: 1,
      perPage: 50,
      sort: "igsn",
    });
  });
});

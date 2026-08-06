import { HttpResponse, http } from "msw";
import { page } from "vitest/browser";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { AppLayout } from "./app-layout.tsx";

let pathname = "/";
// The layout is rendered outside a router here, so Link degrades to the anchor
// it renders: `to` becomes the href a user (and getByRole("link")) sees.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname }),
}));

const renderLayout = () =>
  render(
    <AppLayout onSignOut={vi.fn()}>
      <p>Sample list</p>
    </AppLayout>,
  );

const fakeIdentity = (overrides: Record<string, unknown>) =>
  worker.use(
    http.get("*/admin/currentUser", () =>
      HttpResponse.json({
        sub: "s",
        name: "Marie Dupont",
        orcid: null,
        status: "accepted",
        superAdmin: false,
        ...overrides,
      }),
    ),
  );

beforeAll(() => page.viewport(1024, 768));

beforeEach(() => {
  pathname = "/";
});

describe("AppLayout", () => {
  it("should warn a pending user that their account awaits validation", async () => {
    fakeIdentity({ status: "pending" });

    const screen = await renderLayout();

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(/not yet validated/i);
    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });

  it("should list both resources in the sidebar for a super admin", async () => {
    fakeIdentity({ superAdmin: true });

    const screen = await renderLayout();
    const nav = screen.getByRole("navigation");

    await expect
      .element(nav.getByRole("link", { name: "Samples" }))
      .toHaveAttribute("href", "/");
    await expect
      .element(nav.getByRole("link", { name: "Users" }))
      .toHaveAttribute("href", "/users");
  });

  it("should list only the samples resource for a plain researcher", async () => {
    fakeIdentity({});

    const screen = await renderLayout();
    const nav = screen.getByRole("navigation");

    await expect
      .element(nav.getByRole("link", { name: "Samples" }))
      .toBeVisible();
    expect(nav.getByRole("link", { name: "Users" }).elements()).toHaveLength(0);
  });

  it("should show no banner to an accepted user", async () => {
    fakeIdentity({});

    const screen = await renderLayout();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
    expect(screen.getByRole("status").elements()).toHaveLength(0);
  });
});

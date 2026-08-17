import { page } from "vitest/browser";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { render } from "../../test/render.tsx";
import { AppLayout } from "./app-layout.tsx";

let pathname = "/";
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

beforeAll(() => page.viewport(1024, 768));

beforeEach(() => {
  pathname = "/";
});

describe("AppLayout", () => {
  it("should warn a pending user that their account awaits activation", async () => {
    fakeCurrentUser({ status: "pending" });

    const screen = await renderLayout();

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(/not yet activated/i);
    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });

  it("should offer every admin destination to a super admin", async () => {
    fakeCurrentUser({ superAdmin: true });

    const screen = await renderLayout();
    const nav = screen.getByRole("navigation");
    const groups = screen.getByRole("list", { name: "Institutional groups" });

    await expect
      .element(nav.getByRole("link", { name: "Samples" }))
      .toHaveAttribute("href", "/");
    await expect
      .element(nav.getByRole("link", { name: "Users" }))
      .toHaveAttribute("href", "/users");
    await expect
      .element(nav.getByRole("link", { name: "Manual groups" }))
      .toHaveAttribute("href", "/manual-groups");
    await expect
      .element(groups.getByRole("link", { name: "Organizations" }))
      .toHaveAttribute("href", "/institutional-groups/organizations");
    await expect
      .element(groups.getByRole("link", { name: "OSUs" }))
      .toHaveAttribute("href", "/institutional-groups/osus");
    await expect
      .element(groups.getByRole("link", { name: "Laboratories" }))
      .toHaveAttribute("href", "/institutional-groups/laboratories");
  });

  it("should list only the samples resource for a plain researcher", async () => {
    fakeCurrentUser();

    const screen = await renderLayout();
    const nav = screen.getByRole("navigation");

    await expect
      .element(nav.getByRole("link", { name: "Samples" }))
      .toBeVisible();
    expect(nav.getByRole("link", { name: "Users" }).elements()).toHaveLength(0);
    expect(
      nav.getByRole("link", { name: "Organizations" }).elements(),
    ).toHaveLength(0);
    expect(nav.getByRole("link", { name: "OSUs" }).elements()).toHaveLength(0);
    expect(
      nav.getByRole("link", { name: "Laboratories" }).elements(),
    ).toHaveLength(0);
    expect(
      nav.getByRole("link", { name: "Manual groups" }).elements(),
    ).toHaveLength(0);
  });

  it("should show no banner to an accepted user", async () => {
    fakeCurrentUser();

    const screen = await renderLayout();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
    expect(screen.getByRole("status").elements()).toHaveLength(0);
  });
});

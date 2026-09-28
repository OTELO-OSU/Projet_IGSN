import { page } from "vitest/browser";

import { FRONTEND_URL } from "#/frontend-url.ts";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { render } from "../../test/render.tsx";
import { AppLayout } from "./app-layout.tsx";

let pathname = "/";
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children?: React.ReactNode;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
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
  localStorage.clear();
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
      .element(nav.getByRole("link", { name: "My samples" }))
      .toHaveAttribute("href", "/");
    await expect
      .element(nav.getByRole("link", { name: "Sample moderation" }))
      .toHaveAttribute("href", "/samples/moderation");
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

  it("should offer the manual groups to a manual group manager", async () => {
    fakeCurrentUser({
      managedManualGroups: [
        { id: "3f2504e0-4f89-41d3-9a0c-0305000000a1", name: "Basalt team" },
      ],
    });

    const screen = await renderLayout();
    const nav = screen.getByRole("navigation");

    await expect
      .element(nav.getByRole("link", { name: "Manual groups" }))
      .toHaveAttribute("href", "/manual-groups");
    await expect
      .element(nav.getByRole("link", { name: "Sample moderation" }))
      .toHaveAttribute("href", "/samples/moderation");
    expect(nav.getByRole("link", { name: "Users" }).elements()).toHaveLength(0);
    expect(
      nav.getByRole("link", { name: "Laboratories" }).elements(),
    ).toHaveLength(0);
  });

  it("should show a plain researcher the logo but no sidebar", async () => {
    fakeCurrentUser();

    const screen = await renderLayout();

    await expect
      .element(
        screen
          .getByRole("banner")
          .getByRole("link", { name: "IGSN Dashboard" }),
      )
      .toBeInTheDocument();
    expect(screen.getByRole("navigation").elements()).toHaveLength(0);
  });

  it("should let a manager collapse the menu and keep it collapsed", async () => {
    fakeCurrentUser({ superAdmin: true });

    const screen = await renderLayout();
    await screen.getByRole("button", { name: "Collapse menu" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Expand menu" }))
      .toHaveAttribute("aria-expanded", "false");
    await expect
      .element(screen.getByRole("link", { name: "Users" }))
      .toBeInTheDocument();

    const remounted = await renderLayout();

    await expect
      .element(remounted.getByRole("button", { name: "Expand menu" }))
      .toBeVisible();
  });

  it("should offer a way back to the public site", async () => {
    fakeCurrentUser();

    const screen = await renderLayout();

    await expect
      .element(screen.getByRole("link", { name: "Go to public site" }))
      .toHaveAttribute("href", FRONTEND_URL);
  });

  it("should show no banner to an accepted user", async () => {
    fakeCurrentUser();

    const screen = await renderLayout();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
    expect(screen.getByRole("status").elements()).toHaveLength(0);
  });
});

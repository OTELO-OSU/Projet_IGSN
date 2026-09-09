import { laboratoryLabel } from "@projet-igsn/domain/institutional-group/label";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";
import { RequestServiceAccountForm } from "./request-service-account-form.tsx";

const laboratory = "UMR7358";
const laboratoryOption = `${laboratoryLabel(laboratory)} (${laboratory})`;

const group = {
  id: "01980e2d-6f9b-7000-9000-000000000001",
  name: "ANR CritMet",
};

const signedIn = {
  isAuthenticated: true,
  user: { access_token: "a-token", profile: { sub: "jean" } },
} as Parameters<typeof stubAuth>[1];

type SeenPost = { url: string; token: string | null; body: string };

const urlOf = (input: RequestInfo | URL) =>
  input instanceof URL
    ? input.href
    : typeof input === "string"
      ? input
      : input.url;

function stubApi() {
  const posts: SeenPost[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    if (init?.method === "POST") {
      posts.push({
        url: urlOf(input),
        token: new Headers(init.headers).get("Authorization"),
        body: typeof init.body === "string" ? init.body : "",
      });
      return new Response(null, { status: 204 });
    }
    const { pathname } = new URL(urlOf(input));
    if (pathname === "/api/admin/currentUser/attachable-manual-groups") {
      return Response.json({ data: [group] });
    }
    if (
      pathname === "/api/admin/currentUser/service-accounts/requestable-groups"
    ) {
      return Response.json({
        data: { organizations: [], osus: [], laboratories: [laboratory] },
      });
    }
    return new Response(null, { status: 404 });
  });
  return posts;
}

const renderForm = (onSent = vi.fn()) =>
  renderWithRouter(
    stubAuth(<RequestServiceAccountForm onSent={onSent} />, signedIn),
  );

describe("RequestServiceAccountForm", () => {
  it("should post the service name and the picked group with the visitor's token", async () => {
    const posts = stubApi();
    const onSent = vi.fn();
    const screen = await renderForm(onSent);

    await screen.getByLabelText("Service name").fill("Basalt pipeline");
    await screen
      .getByLabelText("Why do you need a service account?")
      .fill("Automate our basalt uploads");
    await screen.getByRole("combobox", { name: "Groups to access" }).click();
    await page.getByRole("option", { name: group.name }).click();
    await screen
      .getByRole("combobox", { name: "Laboratories to access" })
      .click();
    await page.getByRole("option", { name: laboratoryOption }).click();
    await page.getByRole("button", { name: "Send request" }).click();

    await vi.waitFor(() => expect(posts).toHaveLength(1));
    const { url, token, body } = posts[0]!;
    expect(new URL(url).pathname).toBe(
      "/api/admin/currentUser/service-accounts/requests",
    );
    expect(token).toBe("Bearer a-token");
    expect(JSON.parse(body)).toEqual({
      name: "Basalt pipeline",
      reason: "Automate our basalt uploads",
      managedGroups: {
        organizations: [],
        osus: [],
        laboratories: [laboratory],
        manualGroupIds: [group.id],
      },
    });
    expect(onSent).toHaveBeenCalled();
  });

  it("should offer only the laboratories the requester may request", async () => {
    stubApi();
    const screen = await renderForm();

    await screen
      .getByRole("combobox", { name: "Laboratories to access" })
      .click();

    await expect
      .poll(() => page.getByRole("option").elements())
      .toHaveLength(1);
  });

  it("should replace a picker the requester may request nothing from with a message", async () => {
    stubApi();
    const screen = await renderForm();

    await expect
      .element(screen.getByText("You don't have access to any organization."))
      .toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Organizations to access" }).query(),
    ).toBeNull();
  });

  it("should flag the name and the reason and post nothing when both are blank", async () => {
    const posts = stubApi();
    const screen = await renderForm();

    await screen.getByRole("button", { name: "Send request" }).click();

    await expect
      .element(screen.getByLabelText("Service name"))
      .toHaveAttribute("aria-invalid", "true");
    await expect
      .element(screen.getByLabelText("Why do you need a service account?"))
      .toHaveAttribute("aria-invalid", "true");
    await expect
      .element(screen.getByRole("alert").first())
      .toHaveTextContent("This field is required.");
    expect(posts).toEqual([]);
  });
});

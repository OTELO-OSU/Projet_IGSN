import { laboratoryLabel } from "@projet-igsn/domain/institutional-group/label";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { RequestServiceAccountForm } from "./request-service-account-form.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: { access_token: "a-token", profile: { sub: "jean" } },
  }),
}));

const laboratory = "UMR7358";
const laboratoryOption = `${laboratoryLabel(laboratory)} (${laboratory})`;

const group = {
  id: "01980e2d-6f9b-7000-9000-000000000001",
  name: "ANR CritMet",
};

const SAMPLES_OWNER = {
  id: "01980e2d-6f9b-7000-9000-0000000000c1",
  email: "claire.dupont@univ-lorraine.fr",
  name: "Dupont",
  firstname: "Claire",
  orcid: null,
};

type SeenPost = { pathname: string; token: string | null; body: unknown };

function fakeApi() {
  const posts: SeenPost[] = [];
  const searches: URLSearchParams[] = [];
  worker.use(
    http.get("*/admin/users/search", ({ request }) => {
      searches.push(new URL(request.url).searchParams);
      return HttpResponse.json({ data: [SAMPLES_OWNER] });
    }),
    http.get("*/admin/currentUser/attachable-manual-groups", () =>
      HttpResponse.json({ data: [group] }),
    ),
    http.get("*/admin/currentUser/service-accounts/requestable-groups", () =>
      HttpResponse.json({
        data: { organizations: [], osus: [], laboratories: [laboratory] },
      }),
    ),
    http.post(
      "*/admin/currentUser/service-accounts/requests",
      async ({ request }) => {
        posts.push({
          pathname: new URL(request.url).pathname,
          token: request.headers.get("Authorization"),
          body: await request.json(),
        });
        return new HttpResponse(null, { status: 204 });
      },
    ),
  );
  return { posts, searches };
}

const renderForm = (onSent = vi.fn()) =>
  render(<RequestServiceAccountForm onSent={onSent} />);

async function pickSamplesOwner(
  screen: Awaited<ReturnType<typeof renderForm>>,
) {
  await screen.getByRole("combobox", { name: /^Samples owner/ }).click();
  await page.getByPlaceholder("Search by name or email").fill("dup");
  await page.getByRole("option", { name: /Claire Dupont/ }).click();
}

async function fillNameAndReason(
  screen: Awaited<ReturnType<typeof renderForm>>,
) {
  await screen.getByLabelText("Service name").fill("Basalt pipeline");
  await screen
    .getByLabelText("Why do you need a service account?")
    .fill("Automate our basalt uploads");
}

describe("RequestServiceAccountForm", () => {
  it("should post the service name, the samples owner and the picked group with the requester's token", async () => {
    const { posts } = fakeApi();
    const onSent = vi.fn();
    const screen = await renderForm(onSent);

    await fillNameAndReason(screen);
    await pickSamplesOwner(screen);
    await screen.getByRole("combobox", { name: "Groups to access" }).click();
    await page.getByRole("option", { name: group.name }).click();
    await screen
      .getByRole("combobox", { name: "Laboratories to access" })
      .click();
    await page.getByRole("option", { name: laboratoryOption }).click();
    await page.getByRole("button", { name: "Send request" }).click();

    await vi.waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      pathname: "/api/admin/currentUser/service-accounts/requests",
      token: "Bearer a-token",
      body: {
        name: "Basalt pipeline",
        reason: "Automate our basalt uploads",
        sampleOwnerId: SAMPLES_OWNER.id,
        managedGroups: {
          organizations: [],
          osus: [],
          laboratories: [laboratory],
          manualGroupIds: [group.id],
        },
      },
    });
    await vi.waitFor(() => expect(onSent).toHaveBeenCalled());
  });

  it("should search the samples owner among the requester's groups, the requester included", async () => {
    const { searches } = fakeApi();
    const screen = await renderForm();

    await pickSamplesOwner(screen);

    expect(searches.at(-1)?.get("inMyGroups")).toBe("true");
    expect(searches.at(-1)?.get("includeSelf")).toBe("true");
    expect(searches.at(-1)?.get("status")).toBe("accepted");
  });

  it("should refuse to send a request without a samples owner", async () => {
    const { posts } = fakeApi();
    const screen = await renderForm();

    await fillNameAndReason(screen);
    await screen.getByRole("button", { name: "Send request" }).click();

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Choose the user who will own the created samples");
    expect(posts).toEqual([]);
  });

  it("should offer only the laboratories the requester may request", async () => {
    fakeApi();
    const screen = await renderForm();

    await screen
      .getByRole("combobox", { name: "Laboratories to access" })
      .click();

    await expect
      .poll(() => page.getByRole("option").elements())
      .toHaveLength(1);
  });

  it("should replace a picker the requester may request nothing from with a message", async () => {
    fakeApi();
    const screen = await renderForm();

    await expect
      .element(screen.getByText("You don't have access to any organization."))
      .toBeVisible();
    await expect
      .element(screen.getByText("Organizations to access"))
      .toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Organizations to access" }).query(),
    ).toBeNull();
  });

  it("should mark the name, the reason and the samples owner as required, not the group pickers", async () => {
    fakeApi();
    const screen = await renderForm();

    await expect
      .element(screen.getByLabelText("Service name *", { exact: true }))
      .toBeVisible();
    await expect
      .element(
        screen.getByLabelText("Why do you need a service account? *", {
          exact: true,
        }),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("combobox", { name: "Samples owner *", exact: true }),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("combobox", { name: "Groups to access", exact: true }),
      )
      .toBeVisible();
  });

  it("should flag the name and the reason and post nothing when both are blank", async () => {
    const { posts } = fakeApi();
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

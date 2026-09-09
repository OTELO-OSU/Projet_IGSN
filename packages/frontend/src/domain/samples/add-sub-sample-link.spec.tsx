import { ADMIN_URL } from "#/admin-url.ts";
import { AddSubSampleLink } from "#/domain/samples/add-sub-sample-link.tsx";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";

const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const signedIn = {
  isAuthenticated: true,
  user: { access_token: "a-token", profile: { sub: "jean" } },
} as Parameters<typeof stubAuth>[1];

describe("AddSubSampleLink", () => {
  it("should link a signed-in visitor to the admin create page carrying the parent", async () => {
    const screen = await renderWithRouter(
      stubAuth(<AddSubSampleLink sampleId={id} />, signedIn),
    );

    await expect
      .element(screen.getByRole("link", { name: "Add a sub sample" }))
      .toHaveAttribute("href", `${ADMIN_URL}/samples/create?parent=${id}`);
  });

  it("should hide the link from a signed-out visitor", async () => {
    const screen = await renderWithRouter(
      stubAuth(<AddSubSampleLink sampleId={id} />),
    );

    await expect
      .element(screen.getByRole("link", { name: "Add a sub sample" }))
      .not.toBeInTheDocument();
  });
});

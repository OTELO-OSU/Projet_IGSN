import { HttpResponse, http } from "msw";

import { worker } from "../test/msw.ts";
import { render } from "../test/render.tsx";
import { UserName } from "./user-name";

describe("UserName", () => {
  it("shows the signed-in user's name", async () => {
    worker.use(
      http.get("*/admin/currentUser", () =>
        HttpResponse.json({
          sub: "s",
          name: "Marie Dupont",
          orcid: null,
          status: "accepted",
          superAdmin: false,
        }),
      ),
    );

    const screen = await render(<UserName />);
    await expect.element(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });
});

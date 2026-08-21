import { fakeCurrentUser } from "../test/fake-current-user.ts";
import { render } from "../test/render.tsx";
import { UserName } from "./user-name";

describe("UserName", () => {
  it("shows the signed-in user's name", async () => {
    fakeCurrentUser();

    const screen = await render(<UserName />);
    await expect.element(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });
});

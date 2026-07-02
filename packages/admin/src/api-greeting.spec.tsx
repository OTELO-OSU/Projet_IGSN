import { render } from "vitest-browser-react";

import { ApiGreeting } from "./api-greeting";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));
vi.mock("./api", () => ({
  fetchMe: () => Promise.resolve({ sub: "s", name: "Marie Dupont" }),
}));

describe("ApiGreeting", () => {
  it("shows who the api verified the user as", async () => {
    const screen = await render(<ApiGreeting />);
    await expect
      .element(screen.getByText("API verified you as Marie Dupont"))
      .toBeInTheDocument();
  });
});

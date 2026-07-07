import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "vitest-browser-react";

import { UserName } from "./user-name";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));
vi.mock("./api", () => ({
  fetchMe: () => Promise.resolve({ sub: "s", name: "Marie Dupont" }),
}));

describe("UserName", () => {
  it("shows the signed-in user's name", async () => {
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <UserName />
      </QueryClientProvider>,
    );
    await expect.element(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });
});

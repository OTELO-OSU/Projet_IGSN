import { isSignoutCallback, onSignoutCallback } from "./oidc-config.ts";

const callbackPath = import.meta.env.BASE_URL + "auth/callback";

describe("isSignoutCallback", () => {
  it.each([
    { pathname: callbackPath, search: "?state=x", expected: true },
    { pathname: callbackPath, search: "?code=y&state=x", expected: false },
    { pathname: callbackPath, search: "", expected: false },
    { pathname: "/other", search: "?state=x", expected: false },
  ])(
    "should recognize a sign-out return alone ($pathname$search)",
    ({ pathname, search, expected }) => {
      expect(isSignoutCallback({ pathname, search })).toBe(expected);
    },
  );
});

describe("onSignoutCallback", () => {
  it.each([
    { userState: "/samples/x", path: "/samples/x" },
    { userState: "//evil.example", path: "/" },
  ])(
    "should send the visitor back to the safe path the sign-out carried ($userState)",
    ({ userState, path }) => {
      const navigate = vi.fn();

      onSignoutCallback({ userState }, navigate);

      expect(navigate).toHaveBeenCalledWith(path);
    },
  );

  it.each([{ resp: undefined }, { resp: { userState: undefined } }])(
    "should stay on the admin callback when the sign-out carried no path ($resp)",
    ({ resp }) => {
      const navigate = vi.fn();

      onSignoutCallback(resp, navigate);

      expect(navigate).not.toHaveBeenCalled();
    },
  );
});

import {
  broadcastSignOut,
  isSignOutBroadcast,
  SIGN_OUT_BROADCAST_KEY,
} from "./sign-out-broadcast.ts";

describe("broadcastSignOut", () => {
  it("should write a different value under the sign-out key on two consecutive calls", () => {
    const calls: [string, string][] = [];
    const storage = {
      setItem: (key: string, value: string) => calls.push([key, value]),
    };

    broadcastSignOut(storage);
    broadcastSignOut(storage);

    expect(calls.map(([key]) => key)).toEqual([
      SIGN_OUT_BROADCAST_KEY,
      SIGN_OUT_BROADCAST_KEY,
    ]);
    expect(calls[0]?.[1]).not.toBe(calls[1]?.[1]);
  });
});

describe("isSignOutBroadcast", () => {
  it("should accept an event on the sign-out key", () => {
    expect(isSignOutBroadcast({ key: SIGN_OUT_BROADCAST_KEY })).toBe(true);
  });

  it.each([null, "other-key"])("should reject an event on %s", (key) => {
    expect(isSignOutBroadcast({ key })).toBe(false);
  });
});

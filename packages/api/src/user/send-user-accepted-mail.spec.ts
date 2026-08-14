import { describe, expect, it, vi } from "vitest";

import { sendUserAcceptedMail } from "./send-user-accepted-mail.ts";

const ADMIN_URL = "http://localhost:3001/";

const user = {
  email: "marie.dupont@univ-lorraine.fr",
  name: "Dupont",
  firstname: "Marie",
};

describe("sendUserAcceptedMail", () => {
  it("should mail the accepted user", async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);

    await sendUserAcceptedMail(user, sendMail, ADMIN_URL);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["marie.dupont@univ-lorraine.fr"],
        subject: "Your account has been activated",
      }),
    );
  });

  it("should log a refused send rather than fail", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendMail = vi.fn().mockRejectedValue(new Error("SMTP down"));

    await expect(
      sendUserAcceptedMail(user, sendMail, ADMIN_URL),
    ).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});

import { describe, expect, it, vi } from "vitest";

import { notifyManualGroupJoined } from "./notify-manual-group-joined.ts";

const ADMIN_URL = "http://localhost:3001/admin/";

const CURIE = {
  id: "01890a5d-ac96-774b-bcce-b302099a9001",
  email: "marie.curie@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
};

const DUPONT = {
  id: "01890a5d-ac96-774b-bcce-b302099a9002",
  email: "pierre.dupont@univ-lorraine.fr",
  name: "Dupont",
  firstname: "Pierre",
};

describe("notifyManualGroupJoined", () => {
  it("should link the invitee to the settings page under the admin path", async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);

    notifyManualGroupJoined({
      actor: CURIE,
      invitee: DUPONT,
      groups: [{ id: "01890a5d-ac96-774b-bcce-b302099a9003", name: "Massif" }],
      mail: { sendMail, adminUrl: ADMIN_URL },
    });

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    expect(sendMail.mock.calls[0]?.[0].text).toContain(`${ADMIN_URL}settings`);
  });
});

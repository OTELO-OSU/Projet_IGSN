import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { SampleCollaborator } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { UserStatus } from "@projet-igsn/domain/user/model";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Mail } from "../mail/send-mail.ts";

import { MAIL_REQUEST_USER_BUDGET } from "../rate-limit/config.ts";
import { notifySubSampleDeclared } from "./notify-sub-sample-declared.ts";

const ADMIN_URL = "http://localhost:3001/admin/";

let DECLARER = declarer();

function declarer() {
  return {
    id: crypto.randomUUID(),
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
  };
}

const SUB_SAMPLE = {
  id: "01890a5d-ac96-774b-bcce-b302099a9010",
  name: "Lame mince A12",
};

const PUY = { id: "01890a5d-ac96-774b-bcce-b302099a9020", name: "Basalte" };
const VOSGES = { id: "01890a5d-ac96-774b-bcce-b302099a9021", name: "Granite" };

const collaborator = (
  id: string,
  role: UserSampleRole,
  status: UserStatus = "accepted",
): SampleCollaborator => ({
  id,
  email: `${id}@univ-lorraine.fr`,
  name: null,
  firstname: null,
  orcid: null,
  role,
  status,
});

const notify = (
  collaborators: Record<string, SampleCollaborator[]>,
  parents: { id: string; name: string }[],
  sendMail: (mail: Mail) => Promise<void>,
) =>
  notifySubSampleDeclared({
    userSamples: {
      listCollaborators: (sampleId: string) =>
        Promise.resolve(collaborators[sampleId] ?? []),
    },
    mail: { sendMail, adminUrl: ADMIN_URL },
    declarer: DECLARER,
    subSample: SUB_SAMPLE,
    parents,
  });

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("notifySubSampleDeclared", () => {
  beforeEach(() => {
    DECLARER = declarer();
  });

  it("should mail the parent owner alone, never its editors and contributors", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notify(
      {
        [PUY.id]: [
          collaborator("owner", "owner"),
          collaborator("editor", "editor"),
          collaborator("contributor", "contributor"),
        ],
      },
      [PUY],
      sendMail,
    );

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    expect(sendMail.mock.calls[0]?.[0].to).toEqual(["owner@univ-lorraine.fr"]);
  });

  it("should mail nobody when the declarer owns the parent", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notify({ [PUY.id]: [collaborator(DECLARER.id, "owner")] }, [PUY], sendMail);

    await settled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("should mail nobody when the owner's account cannot receive mail", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notify(
      { [PUY.id]: [collaborator("owner", "owner", "rejected")] },
      [PUY],
      sendMail,
    );

    await settled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("should send one mail citing both parents when the same owner owns them", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notify(
      {
        [PUY.id]: [collaborator("owner", "owner")],
        [VOSGES.id]: [collaborator("owner", "owner")],
      },
      [PUY, VOSGES],
      sendMail,
    );

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    expect(sendMail.mock.calls[0]?.[0].text).toContain(
      `"${PUY.name}", "${VOSGES.name}"`,
    );
  });

  it("should mail each owner about their own parent alone", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notify(
      {
        [PUY.id]: [collaborator("first", "owner")],
        [VOSGES.id]: [collaborator("second", "owner")],
      },
      [PUY, VOSGES],
      sendMail,
    );

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
    expect(
      sendMail.mock.calls.map(([mail]) => [
        mail.to,
        mail.text.includes(PUY.name),
        mail.text.includes(VOSGES.name),
      ]),
    ).toEqual([
      [["first@univ-lorraine.fr"], true, false],
      [["second@univ-lorraine.fr"], false, true],
    ]);
  });

  it("should still mail the other parents' owners when one parent fails to resolve", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notifySubSampleDeclared({
      userSamples: {
        listCollaborators: (sampleId: string) =>
          sampleId === PUY.id
            ? Promise.reject(new Error("connection lost"))
            : Promise.resolve([collaborator("second", "owner")]),
      },
      mail: { sendMail, adminUrl: ADMIN_URL },
      declarer: DECLARER,
      subSample: SUB_SAMPLE,
      parents: [PUY, VOSGES],
    });

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    expect(sendMail.mock.calls[0]?.[0].to).toEqual(["second@univ-lorraine.fr"]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("should stop mailing once the declarer spent the mail budget", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();
    const owner = { [PUY.id]: [collaborator("owner", "owner")] };

    for (let sent = 0; sent <= MAIL_REQUEST_USER_BUDGET.points; sent++) {
      notify(owner, [PUY], sendMail);
      await settled();
    }

    expect(sendMail).toHaveBeenCalledTimes(MAIL_REQUEST_USER_BUDGET.points);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("should log a failing send instead of throwing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendMail = vi
      .fn<(mail: Mail) => Promise<void>>()
      .mockRejectedValue(new Error("smtp down"));

    notify({ [PUY.id]: [collaborator("owner", "owner")] }, [PUY], sendMail);

    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    error.mockRestore();
  });
});

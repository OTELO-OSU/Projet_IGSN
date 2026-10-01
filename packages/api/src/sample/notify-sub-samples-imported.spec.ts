import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { SampleCollaborator } from "@projet-igsn/domain/user-sample/user-sample-validator";

import { describe, expect, it, vi } from "vitest";

import type { Mail } from "../mail/send-mail.ts";

import { notifySubSamplesImported } from "./notify-sub-samples-imported.ts";

const ADMIN_URL = "http://localhost:3001/admin/";

const declarer = () => ({
  id: crypto.randomUUID(),
  email: "jean.martin@univ-lorraine.fr",
  name: "Martin",
  firstname: "Jean",
});

const PUY = { id: "01890a5d-ac96-774b-bcce-b302099a9020", name: "Basalte" };
const VOSGES = { id: "01890a5d-ac96-774b-bcce-b302099a9021", name: "Granite" };

const collaborator = (
  id: string,
  role: UserSampleRole,
): SampleCollaborator => ({
  id,
  email: `${id}@univ-lorraine.fr`,
  name: null,
  firstname: null,
  orcid: null,
  role,
  status: "accepted",
});

const notify = (
  collaborators: Record<string, SampleCollaborator[]>,
  parentIds: string[],
  sendMail: (mail: Mail) => Promise<void>,
  importer = declarer(),
) =>
  notifySubSamplesImported({
    userSamples: {
      listCollaborators: (sampleId: string) =>
        Promise.resolve(collaborators[sampleId] ?? []),
    },
    mail: { sendMail, adminUrl: ADMIN_URL },
    declarer: importer,
    parents: [PUY, VOSGES],
    parentIds,
  });

const sentOf = (
  sendMail: ReturnType<typeof vi.fn<(mail: Mail) => Promise<void>>>,
) => sendMail.mock.calls.map(([mail]) => [mail.to, mail.subject]);

describe("notifySubSamplesImported", () => {
  it("should send an owner one mail counting every imported sub-sample of their samples", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notify(
      {
        [PUY.id]: [collaborator("owner", "owner")],
        [VOSGES.id]: [collaborator("owner", "owner")],
      },
      [PUY.id, VOSGES.id],
      sendMail,
    );

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalled());
    expect(sentOf(sendMail)).toEqual([
      [
        ["owner@univ-lorraine.fr"],
        "Jean Martin declared 2 sub-samples of your samples by import",
      ],
    ]);
  });

  it("should mail each parent owner about their own sub-samples alone", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();

    notify(
      {
        [PUY.id]: [collaborator("first", "owner")],
        [VOSGES.id]: [collaborator("second", "owner")],
      },
      [PUY.id, PUY.id, VOSGES.id],
      sendMail,
    );

    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
    expect(sentOf(sendMail)).toEqual([
      [
        ["first@univ-lorraine.fr"],
        "Jean Martin declared 2 sub-samples of your samples by import",
      ],
      [
        ["second@univ-lorraine.fr"],
        "Jean Martin declared a sub-sample of your samples by import",
      ],
    ]);
  });

  it("should not mail the importer about sub-samples of their own samples", async () => {
    const sendMail = vi.fn<(mail: Mail) => Promise<void>>();
    const importer = declarer();

    notify(
      { [PUY.id]: [collaborator(importer.id, "owner")] },
      [PUY.id],
      sendMail,
      importer,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendMail).not.toHaveBeenCalled();
  });
});

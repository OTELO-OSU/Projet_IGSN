import type { UserStatus } from "@projet-igsn/domain/user/model";

import { describe, expect, vi } from "vitest";

import type { Mail } from "../mail/send-mail.ts";

import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { draft } from "../tests/sample-fixtures.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { createUserSampleRepository } from "../user-sample/repository.ts";
import { notifySampleModerated } from "./notify-sample-moderated.ts";
import { insertSample } from "./service/insert-sample.ts";

const ADMIN_URL = "https://admin.example.test/admin/";

describe("notifySampleModerated", () => {
  pgTest.for([
    ["accepted", ["owner@example.com"]],
    ["rejected", []],
  ] as [UserStatus, string[]][])(
    "should mail the fields changed to an owner whose account is %s",
    async ([status, expected], { db }) => {
      // Arrange
      const sendMail = vi.fn<(mail: Mail) => Promise<void>>();
      const owner = await insertUser(db, "owner@example.com", { status });
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      // Act
      await notifySampleModerated({
        userSamples: createUserSampleRepository(db),
        mail: { sendMail, adminUrl: ADMIN_URL },
        sample,
        fields: ["name"],
      });
      // Assert
      expect(sendMail.mock.calls.flatMap(([mail]) => mail.to)).toEqual(
        expected,
      );
    },
  );
});

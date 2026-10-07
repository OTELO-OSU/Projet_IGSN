import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { canDeclareSubSample } from "./can-declare-sub-sample.ts";

describe("canDeclareSubSample", () => {
  it.each([
    ["anyone may sub-sample a published sample", "published", null, false],
    [
      "anyone may sub-sample a published sample",
      "published",
      "contributor",
      false,
    ],
    ["anyone may sub-sample a published sample", "published", null, true],
    [
      "a withdrawn sample is open to a role on it",
      "withdrawn",
      "contributor",
      false,
    ],
    ["a withdrawn sample is open to moderation reach", "withdrawn", null, true],
    [
      "an embargo sample is open to a role on it",
      "embargo",
      "contributor",
      false,
    ],
    ["an embargo sample is open to moderation reach", "embargo", null, true],
    [
      "a tombstone sample is open to a manager whose scope covers it",
      "tombstone",
      null,
      true,
    ],
  ] as [string, SampleStatus, UserSampleRole | null, boolean][])(
    "should allow the sub-sample because %s",
    (_rule, status, role, managed) => {
      expect(canDeclareSubSample({ status }, { role, managed })).toBe(true);
    },
  );

  it.each([
    ["a draft sample can never have a sub-sample", "draft", null, false],
    [
      "a draft sample can never have a sub-sample",
      "draft",
      "contributor",
      false,
    ],
    ["a draft sample can never have a sub-sample", "draft", null, true],
    [
      "a publishing sample can never have a sub-sample",
      "publishing",
      "owner",
      true,
    ],
    [
      "a publish_failed sample can never have a sub-sample",
      "publish_failed",
      "owner",
      true,
    ],
    [
      "a withdrawn sample needs a role on it or moderation reach",
      "withdrawn",
      null,
      false,
    ],
    [
      "an embargo sample needs a role on it or moderation reach",
      "embargo",
      null,
      false,
    ],
    [
      "a tombstone sample needs moderation reach, a role is not enough",
      "tombstone",
      "contributor",
      false,
    ],
    ["a tombstone sample needs moderation reach", "tombstone", null, false],
  ] as [string, SampleStatus, UserSampleRole | null, boolean][])(
    "should refuse the sub-sample because %s",
    (_rule, status, role, managed) => {
      expect(canDeclareSubSample({ status }, { role, managed })).toBe(false);
    },
  );
});

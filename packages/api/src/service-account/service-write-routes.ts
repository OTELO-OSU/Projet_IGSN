import type { OpenAPIHono } from "@hono/zod-openapi";
import type { SuspectedDuplicate } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { DuplicateConflict } from "@projet-igsn/domain/sample/sample-validator";
import type {
  FrozenServiceSample,
  ServiceSampleIssue,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { Context } from "hono";

import { changedSampleFields } from "@projet-igsn/domain/sample/changed-sample-fields";
import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";

import type { SendMail } from "../mail/send-mail.ts";

import {
  type ServiceEnv,
  keyedServiceAccount,
} from "../auth/require-service-account.ts";
import { notifySampleModerated } from "../sample/notify-sample-moderated.ts";
import { notifySubSampleDeclared } from "../sample/notify-sub-sample-declared.ts";
import {
  catchChildNotEligible,
  ChildNotEligibleError,
} from "../sample/service/replace-sample-children.ts";
import { withSeriesId } from "../sample/with-series-id.ts";
import { checkServiceUpdate } from "./check-service-update.ts";
import {
  createSampleRoute,
  updateSampleRoute,
} from "./service-route-definitions.ts";
import {
  type ServiceSampleChecksDeps,
  checkServiceCreate,
} from "./service-sample-checks.ts";
import {
  createDuplicates,
  updateDuplicates,
} from "./service-sample-duplicates.ts";
import { invalidSample, serviceSampleIssue } from "./service-sample-issue.ts";

const conflicting = (
  c: Context<ServiceEnv>,
  duplicates: SuspectedDuplicate[],
) =>
  c.json(
    {
      error: "Suspected duplicate",
      reason: "duplicates",
      duplicates,
    } satisfies DuplicateConflict,
    409,
  );

const forbidden = (c: Context<ServiceEnv>, issues: ServiceSampleIssue[]) =>
  c.json({ error: "Forbidden", issues } satisfies FrozenServiceSample, 403);

export function registerServiceWriteRoutes(
  app: OpenAPIHono<ServiceEnv>,
  checks: ServiceSampleChecksDeps & {
    samples: Pick<SampleRepository, "createPublished" | "update">;
  },
  frontendUrl: string,
  userSamples: Pick<UserSampleRepository, "listCollaborators">,
  mail?: { sendMail: SendMail; adminUrl: string },
): void {
  const { samples } = checks;
  app
    .openapi(createSampleRoute, async (c) => {
      const account = keyedServiceAccount(c);
      const checked = await checkServiceCreate(
        checks,
        account,
        c.req.valid("json"),
      );
      if ("issues" in checked) {
        return invalidSample(c, checked.issues);
      }
      const duplicates = await createDuplicates(
        samples,
        checked.value,
        c.req.valid("query").confirmDuplicates,
      );
      if (duplicates.length > 0) {
        return conflicting(c, duplicates);
      }
      const created = await catchChildNotEligible(
        samples.createPublished(
          checked.value.input,
          account.sampleOwner.id,
          account,
        ),
      );
      if (created instanceof ChildNotEligibleError) {
        return invalidSample(c, [serviceSampleIssue("child_not_eligible", [])]);
      }
      notifySubSampleDeclared({
        userSamples,
        mail,
        declarer: account.sampleOwner,
        subSample: created,
        parents: checked.value.parents,
      });
      return c.json(toCoreSample(created, frontendUrl), 201);
    })
    .openapi(updateSampleRoute, async (c) => {
      const account = keyedServiceAccount(c);
      const checked = await checkServiceUpdate(
        checks,
        account,
        c.req.valid("param").igsn,
        c.req.valid("json"),
      );
      if ("refusal" in checked) {
        switch (checked.refusal) {
          case "not_found":
            return c.json({ error: "Not found" }, 404);
          case "forbidden":
            return c.json({ error: "Forbidden" }, 403);
          case "frozen":
            return forbidden(c, checked.issues);
          case "invalid":
            return invalidSample(c, checked.issues);
        }
      }
      const { current, merged } = checked.value;
      const duplicates = await updateDuplicates(
        samples,
        checked.value,
        c.req.valid("query").confirmDuplicates,
      );
      if (duplicates.length > 0) {
        return conflicting(c, duplicates);
      }
      const updated = await catchChildNotEligible(
        samples.update(current.id, merged),
      );
      if (updated instanceof ChildNotEligibleError) {
        return invalidSample(c, [serviceSampleIssue("child_not_eligible", [])]);
      }
      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }
      notifySubSampleDeclared({
        userSamples,
        mail,
        declarer: account.sampleOwner,
        subSample: updated,
        parents: checked.value.parents,
      });
      const fields = changedSampleFields(withSeriesId(current), merged);
      if (mail && fields.length > 0) {
        // ponytail: fire and forget; a retry queue if a lost notification ever matters.
        void notifySampleModerated({
          userSamples,
          mail,
          sample: updated,
          fields,
          actorId: account.sampleOwner.id,
        });
      }
      return c.json(toCoreSample(updated, frontendUrl), 200);
    });
}

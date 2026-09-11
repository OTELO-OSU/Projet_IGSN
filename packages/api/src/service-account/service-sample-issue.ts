import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import type {
  ServiceSampleIssue,
  ServiceSampleIssueCode,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { z } from "zod";

import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";

export function serviceSampleIssue(
  code: ServiceSampleIssueCode | z.core.$ZodIssueCode,
  path: readonly PropertyKey[],
  message?: string,
): ServiceSampleIssue {
  return {
    path: path.length > 0 ? path.map(String).join(".") : undefined,
    code,
    message,
  };
}

export function publishBlockerIssues(
  blockers: readonly PublishBlocker[],
): ServiceSampleIssue[] {
  return blockers.map((blocker) =>
    serviceSampleIssue(blocker, PUBLISH_BLOCKER_PATH[blocker]),
  );
}

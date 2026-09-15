import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import type {
  ServiceSampleIssue,
  ServiceSampleIssueCode,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { z } from "zod";

import { toCorePath } from "@projet-igsn/domain/sample/core/core-path";
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

export function coreSampleIssue(
  code: ServiceSampleIssueCode | z.core.$ZodIssueCode,
  path: readonly PropertyKey[] | string,
  message?: string,
): ServiceSampleIssue {
  const corePath = toCorePath(path);
  return { path: corePath === "" ? undefined : corePath, code, message };
}

export function publishBlockerIssues(
  blockers: readonly PublishBlocker[],
): ServiceSampleIssue[] {
  return blockers.map((blocker) =>
    coreSampleIssue(blocker, PUBLISH_BLOCKER_PATH[blocker]),
  );
}

export function zodIssues(error: z.ZodError): ServiceSampleIssue[] {
  return error.issues.map(({ path, code, message }) =>
    coreSampleIssue(code, path, message),
  );
}

export function frozenFieldIssues(
  paths: readonly string[],
): ServiceSampleIssue[] {
  return paths.map((path) => coreSampleIssue("field_frozen", path));
}

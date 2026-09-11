import type {
  ServiceSampleIssue,
  ServiceSampleIssueCode,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { z } from "zod";

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

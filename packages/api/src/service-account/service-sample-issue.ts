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
    ...(path.length > 0 && { path: path.map(String).join(".") }),
    code,
    ...(message !== undefined && { message }),
  };
}

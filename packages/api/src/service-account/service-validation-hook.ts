import type { OpenAPIHonoOptions } from "@hono/zod-openapi";
import type { InvalidServiceSample } from "@projet-igsn/domain/service-account/service-sample-validator";

import type { ServiceEnv } from "../auth/require-service-account.ts";

import { serviceSampleIssue } from "./service-sample-issue.ts";

export const serviceValidationHook: OpenAPIHonoOptions<ServiceEnv>["defaultHook"] =
  (result, c) => {
    if (result.success) {
      return;
    }
    if (result.target === "json") {
      const body: InvalidServiceSample = {
        error: "Invalid sample",
        issues: result.error.issues.map(({ path, code, message }) =>
          serviceSampleIssue(code, path, message),
        ),
      };
      return c.json(body, 422);
    }
    return c.json(
      {
        error:
          result.target === "param"
            ? "Invalid IGSN"
            : "Invalid query parameters",
      },
      400,
    );
  };

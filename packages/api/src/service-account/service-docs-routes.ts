import type { OpenAPIHono } from "@hono/zod-openapi";

import { swaggerUI } from "@hono/swagger-ui";
import { CORE_SCHEMA_VERSION } from "@projet-igsn/domain/sample/core/core-sample-schema";

import type { ServiceEnv } from "../auth/require-service-account.ts";

import { SERVICE_API_KEY_SCHEME } from "./service-route-definitions.ts";

const SWAGGER_UI_VERSION = "5.32.15";

const OPENAPI_URL = "./openapi.json";

const SWAGGER_UI_INTEGRITY: Record<string, string> = {
  "swagger-ui-bundle.js":
    "sha384-m7zaGj7MPzU+G4lz2eyy73GxK9bbRDr9bB2CSdj8wodg2wu/Wnt6wsoLP3JD+RS9",
  "swagger-ui.css":
    "sha384-fgyWYkUAamzuI8mJFu/xpRP0JWCJRwkwUwsYDoOYVHUJ8NQE5cENn8ib3ppwFFSX",
};

const subresource = (url: string) =>
  `integrity="${SWAGGER_UI_INTEGRITY[url.slice(url.lastIndexOf("/") + 1)]}" crossorigin="anonymous"`;

export function registerServiceDocsRoutes(
  app: OpenAPIHono<ServiceEnv>,
  frontendUrl: string,
): void {
  app.openAPIRegistry.registerComponent(
    "securitySchemes",
    "apiKey",
    SERVICE_API_KEY_SCHEME,
  );
  let document: string | undefined;
  app.get("/openapi.json", (c) =>
    c.body(
      (document ??= JSON.stringify(
        app.getOpenAPI31Document({
          openapi: "3.1.0",
          info: {
            title: "IGSN service API",
            version: CORE_SCHEMA_VERSION,
            description: `Machine API of the IGSN registry, reading and writing published samples as IGSN Core v${CORE_SCHEMA_VERSION} records. Reading is public, a call with no api key omitting the archive contact; writing needs the api key of a service account.`,
          },
          servers: [{ url: new URL("api/service", frontendUrl).toString() }],
        }),
      )),
      200,
      { "content-type": "application/json" },
    ),
  );
  app.get(
    "/docs",
    swaggerUI({
      url: OPENAPI_URL,
      version: SWAGGER_UI_VERSION,
      manuallySwaggerUIHtml: ({ css, js }) => `
        <div id="swagger-ui"></div>
        ${css.map((url) => `<link rel="stylesheet" href="${url}" ${subresource(url)} />`).join("")}
        ${js.map((url) => `<script src="${url}" ${subresource(url)}></script>`).join("")}
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({ dom_id: '#swagger-ui', url: '${OPENAPI_URL}' })
          }
        </script>
      `,
    }),
  );
}

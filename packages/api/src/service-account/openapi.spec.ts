import type { Kysely } from "kysely";

import { DATACITE_MEDIA_TYPE } from "@projet-igsn/domain/sample/datacite/datacite-schema";
import { ISAMPLES_MEDIA_TYPE } from "@projet-igsn/domain/sample/isamples/isamples-schema";
import { describe, expect, it } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";

type OpenApiDocument = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
};

const DOC_OPERATIONS = ["GET /openapi.json", "GET /docs"];

const SWAGGER_UI_VERSION = "5.32.15";

const { app } = createApp({} as Kysely<DB>);

const serviceDocument = async (): Promise<OpenApiDocument> => {
  const res = await app.request("/service/openapi.json");
  return (await res.json()) as OpenApiDocument;
};

const mountedOperations = () =>
  new Set(
    app.routes
      .filter(
        ({ method, path }) => method !== "ALL" && path.startsWith("/service/"),
      )
      .map(
        ({ method, path }) =>
          `${method} ${path.replace("/service", "").replace(":igsn", "{igsn}")}`,
      )
      .filter((operation) => !DOC_OPERATIONS.includes(operation)),
  );

const documentedOperations = (document: OpenApiDocument) =>
  new Set(
    Object.entries(document.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    ),
  );

const undescribedProperties = (node: unknown, path: string): string[] => {
  if (Array.isArray(node)) {
    return node.flatMap((item, index) =>
      undescribedProperties(item, `${path}[${index}]`),
    );
  }
  if (node == null || typeof node !== "object") {
    return [];
  }
  const { properties } = node as {
    properties?: Record<string, { description?: string }>;
  };
  return [
    ...Object.entries(properties ?? {})
      .filter(([, property]) => !property?.description)
      .map(([name]) => `${path}.${name}`),
    ...Object.entries(node).flatMap(([key, value]) =>
      undescribedProperties(value, `${path}.${key}`),
    ),
  ];
};

describe("the /service OpenAPI document", () => {
  it("should declare every mounted route", async () => {
    const document = await serviceDocument();

    expect(documentedOperations(document)).toEqual(mountedOperations());
  });

  it("should describe every property it publishes", async () => {
    const document = await serviceDocument();

    const missing = undescribedProperties(document.components.schemas, "");
    expect(missing, `undescribed: ${missing.join(", ")}`).toEqual([]);
  });

  it.each(["/samples", "/samples/{igsn}"])(
    "should offer every served format on the Accept header of %s",
    async (path) => {
      const document = await serviceDocument();

      const { parameters, responses } = document.paths[path]!.get as {
        parameters: { name: string; in: string; schema: { enum?: string[] } }[];
        responses: Record<string, { content: Record<string, unknown> }>;
      };
      const accept = parameters.find(
        ({ name, in: location }) => name === "accept" && location === "header",
      );
      expect(accept?.schema.enum).toEqual([
        "application/json",
        DATACITE_MEDIA_TYPE,
        ISAMPLES_MEDIA_TYPE,
      ]);
      expect(Object.keys(responses["200"]!.content)).toEqual(
        accept?.schema.enum,
      );
    },
  );

  it("should publish the vocabulary of a controlled filter as an enum", async () => {
    const document = await serviceDocument();

    const { parameters } = document.paths["/samples"]!.get as {
      parameters: { name: string; schema: { enum?: string[] } }[];
    };
    expect(
      parameters.find(({ name }) => name === "natureOfSample")?.schema.enum,
    ).toContain("thin_section");
  });
});

const externalTags = (html: string) =>
  html.match(/<(?:script|link)[^>]*"https:\/\/[^>]*>/g) ?? [];

const patterns = (node: unknown): string[] =>
  node == null || typeof node !== "object"
    ? []
    : Object.entries(node).flatMap(([key, value]) =>
        key === "pattern" && typeof value === "string"
          ? [value]
          : patterns(value),
      );

describe("the /service doc routes", () => {
  it("should load every CDN asset at a pinned version with its integrity hash", async () => {
    const res = await app.request("/service/docs");

    const tags = externalTags(await res.text());
    expect(tags).toHaveLength(2);
    for (const tag of tags) {
      expect(tag).toContain(`swagger-ui-dist@${SWAGGER_UI_VERSION}/`);
      expect(tag).toMatch(/integrity="sha384-[\w+/=]+"/);
      expect(tag).toContain('crossorigin="anonymous"');
    }
  });

  it("should publish no regex flags in a pattern", async () => {
    const document = await serviceDocument();

    const published = patterns(document);
    const flagged = published.filter((pattern) => /\/[a-z]*$/.test(pattern));
    expect(published.length).toBeGreaterThan(0);
    expect(flagged, `flagged: ${flagged.join(", ")}`).toEqual([]);
  });
});

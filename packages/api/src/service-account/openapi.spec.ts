import type { Kysely } from "kysely";

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

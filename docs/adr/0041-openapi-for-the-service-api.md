# 0041. OpenAPI for the service API

Date: 2026-09-15

## Status

Accepted.

## Context

`/service` (ADR [0036](0036-service-account-api-key.md), pivoted to IGSN Core by ADR [0040](0040-igsn-core-pivot-on-service-api.md)) is the registry's only public machine contract, but it published no schema: an integrator had to read the code or the mapping tables to know a body's shape, its statuses or its error format.

## Decision

- The four `/service` routes are declared with `@hono/zod-openapi` (`createRoute` + `app.openapi`), one declaration for the route and its spec entry, so the two cannot drift apart.
- `GET /service/openapi.json` serves the generated OpenAPI 3.1 document and `GET /service/docs` a Swagger UI page, both public and registered ahead of the API-key guard, so a prospective integrator reads the contract before they hold a key. Both still sit behind the mount's per-IP rate limit.
- Request validation moved from the hand-rolled `hono/validator` calls to a `defaultHook` (`service-validation-hook.ts`) that reproduces the same bodies: `param` -> 400 `Invalid IGSN`, `query` -> 400 `Invalid query parameters`, `json` -> 422 `Invalid sample` with Core-path issues.
- Every IGSN Core field carries a `description` on its own `.meta()` in `packages/domain/src/sample/core/`, next to the field it describes, so the published spec is self-explanatory without a second prose pass.
- The document is generated from those declarations at request time and never committed, the zod declarations being its source of truth.
- What the tool cannot check for itself is held by tests: `openapi.spec.ts` asserts no undeclared route, that every published property carries a description, and that no published `pattern` leaks a regex flag, which `@hono/zod-openapi` emits from a flagged `RegExp` and which no client can match.
- The Swagger UI page loads exactly two external subresources (`swagger-ui-bundle.js`, `swagger-ui.css`) from the `swagger-ui-dist@5.32.15` CDN, each pinned with a `sha384` integrity hash and `crossorigin="anonymous"`.
- The document is serialized once and the JSON string is served from memory after that, since the schema is static per process.

## Rejected alternatives

**A hand-assembled document built from `z.toJSONSchema` over the existing schemas.** Leaves the four routes as plain Hono, but paths, parameters and statuses would still be hand-written and free to drift from the route they describe, the exact drift this decision closes.

**A committed `packages/api/openapi.json` snapshot with a drift test.** Makes a contract change visible in a PR diff, but the diff of `service-route-definitions.ts` and the Core schemas already is that change, in its readable form. The snapshot cost 6605 lines, a generator script and a manual regeneration ritual, and nothing read it. What it bought and we gave up: a dependency bump that silently changes the serialization no longer shows up in a PR, which the live `/service/openapi.json` still makes verifiable.

**Self-hosting the Swagger UI assets.** Would add a dependency and a static-file route the api does not otherwise have. The dependencies rule only prefers self-hosting for a critical dependency; a two-file, SRI-pinned CDN load for a docs page is not one.

## Consequences

- `/service` now declares its routes through `createRoute` + `app.openapi`, unlike every other mount in `app.ts`, which stays plain Hono. This is deliberate: `/service` is the only public machine contract, so it is the only mount that needs to publish one.
- Adding a `/service` route means declaring its responses in `service-route-definitions.ts`, or `openapi.spec.ts` fails.
- Serving the document with `getOpenAPI31Document` drops the `try`/`catch` `doc31` wrapped it in; a generation failure now reaches the app's `onError` and answers a generic 500, matching `security-backend.md`.
- The Swagger UI page's two pinned, SRI-checked CDN assets are an accepted, reviewed exception to self-hosting, scoped to a public docs page with no data of its own.

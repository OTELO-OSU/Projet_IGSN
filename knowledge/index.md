---
okf_version: "0.2"
---

# architecture

- [File layout conventions](file-layout-conventions.md) - One folder per entity, one concern per file, kebab-case, no barrel files; api client and hook naming.
- [Package layering](package-layering.md) - domain owns all business logic with no I/O; api implements it and holds the trust boundary; admin and frontend consume domain schemas.

# auth

- [App-level ORCID linking and login](orcid-linking.md) - The ORCID link is a nullable unique orcid column declared by the researcher; an ORCID sign-in resolves strictly by it and never provisions an account.
- [Authentication through Keycloak](auth-keycloak-gaiadata.md) - The admin SPA is env-driven OIDC against an externally-managed GaiaData Keycloak brokering eduGAIN and ORCID; the api verifies tokens with hono/jwk.
- [GaiaData SSO compliance (GT-SSO Recommandations Client v1.3)](gaiadata-sso-compliance.md) - The auth stack is audited against the GT-SSO client recommendations: full claim validation, prod token policy mirrored in dev, and SPA hardening.
- [Local user store and sample ownership](user-store-and-ownership.md) - A local user table keyed by email, provisioned just in time from verified claims behind an IdP allow-list, with ownership in user_sample enforced server-side.
- [Per-sample roles and collaboration](per-sample-roles.md) - user_sample.role is owner | editor | contributor, with three domain predicates deciding update, publish and grant rights.
- [Space manager: scoped user and sample moderation](space-manager-scope.md) - A space manager is a non-empty managed scope, not a flag; reach lives only in SQL and covers users by recorded laboratory and samples by their own codes or groups.
- [User moderation and super admin](user-moderation-super-admin.md) - user.status gates publishing, super admin is a local DB boolean granted only by direct SQL, and three paths send a user back to pending.

# component

- [HierarchySelectField takes the tree as one prop](hierarchy-select-field.md) - The widget receives a self-describing hierarchy prop and derives children, stop policy and labels, so the UI cannot contradict the domain publish gate.

# domain-model

- [allowsLocation: the material-driven location gate](location-material-gate.md) - One predicate decides whether a material allows a location; the Location tab shows by default and hides only for a refusing material.
- [Editable material levels after publication](material-levels-editable.md) - TreeNode.frozenWhenPublished marks the editable frontier per node; frozenMaterialPrefix derives the prefix a published sample must keep.
- [IGSN identifier format and minting](igsn-identifier.md) - Minted IGSNs are a 26-char Crockford base32 suffix, immutable once minted and never reassigned or removed; legacy CNRS/TOAE identifiers are real IGSNs, accepted on read only.
- [Institutional groups (organisme / OSU / labo)](institutional-groups.md) - A static generated catalog forming a graph, not a chain; membership is three codes recorded on a user and snapshotted on a sample.
- [Manual groups](manual-groups.md) - Curated group rows with explicit membership, orthogonal to the institutional catalog, attachable to a sample and frozen once it publishes.
- [Personas and roles](personas-and-roles.md) - Reader, Contributor, Editor as per-sample roles, plus space manager and super admin as account-level reach.
- [Post-publish field mutability](published-field-locks.md) - A published sample is partially mutable: lock maps in published-field-lock.ts name every frozen field, everything unlisted is editable, and the merge is the enforcement.
- [Publish blockers](publish-blockers.md) - samplePublishBlockers is the single place stating why a sample cannot be published; the api guard and the admin tooltip both derive from it.
- [Sample model](sample-model.md) - One wide sample row with flat nullable sub-blocks, two one-to-many child tables, and snapshotted institutional codes.
- [Sample status lifecycle and its three predicates](sample-status-lifecycle.md) - status is draft | published | withdrawn | tombstone, read through three distinct predicates for permanence, public visibility and public resolution.
- [Sample vocabularies as segment-keyed trees](vocabulary-tree.md) - Every sample vocabulary is one segment-keyed TreeNode tree in domain, expanded to flat dot-paths by expandPaths, with per-node completeness.
- [Synthetic sample details](synthetic-details.md) - syntheticDetails is the sub-block a synthetic sample carries instead of a location, gated by isSyntheticMaterial and required in seven fields to publish.

# feature

- [Free-text sample search semantics](sample-search.md) - Tokens AND, wildcards anchor at word boundaries, 5+ character tokens are typo-tolerant at 0.8, all escaping done in SQL after unaccent.
- [Frontend i18n by localized URL](frontend-url-i18n.md) - The public frontend localizes by URL with paraglide's url strategy on TanStack Start; admin is exempt.
- [Legacy IGSN dump import](legacy-import.md) - An idempotent script upserts ~24,910 legacy samples as published rows keeping their CNRS/TOAE identifiers, skipping any row carrying a value it cannot map.
- [Map bounding-box search with Leaflet](map-search-leaflet.md) - Leaflet plus react-leaflet over OSM raster tiles; a drawn rectangle rides the bbox query param into an ST_MakeEnvelope filter.
- [Outbound mail and notifications](mail-notifications.md) - The api sends invitation, moderated-edit, orphan-group and weekly digest mails, rendered twice as text and MJML with i18next copy.
- [Public contributor identities](public-contributor-directory.md) - GET /users publicly names accepted users holding a published sample, powering a shareable per-person filter on the public list.
- [Public search facets registry](search-facets.md) - SAMPLE_FACETS in domain is the single source of truth for public sample-list filters; the admin lists take their own params instead.

# guide

- [Importing a new institution export](sync-institutions-import.md) - Four CSVs in sync-data/ regenerate osu.ts and laboratory.ts, plus a migration clearing any code that disappeared.
- [Updating the sample declaration form](sample-form-update-guide.md) - Every form change starts in domain: a vocabulary value, a characteristic sub-schema, or a display condition, then admin, i18n and the publish decision.

# infrastructure

- [API rate limiting](rate-limiting.md) - In-process counters, one limiter per mount, keyed on the edge-forwarded client IP for public reads and on the JWT sub for admin.
- [Preprod on a single AWS EC2 host](preprod-infrastructure.md) - Three app containers plus Postgres on one EC2 host behind Caddy and Cloudflare on a single origin, deployed manually with images shipped over SSH.
- [Single origin, path-routed apps](single-origin-routing.md) - Frontend, admin and api share one origin behind Caddy, the admin at /admin and the api at /api, in dev, e2e and preprod alike; only Caddy knows the topology.

# persistence

- [Kysely as the backend DBAL](kysely-dbal.md) - api persistence is Kysely, a type-safe SQL query builder and not an ORM, tested against a real Postgres.
- [Material classification stored as ltree](material-classification-ltree.md) - sample.material is one Postgres ltree column with a GiST index, holding a dot-joined path of vocabulary codes.
- [Sample location: PostGIS storage and model](sample-location.md) - Raw coordinate columns on sample are the CRUD source of truth; a generated planar geometry column carries the GiST-indexed search geometry.
- [Sample relations and attachments](sample-relations-attachments.md) - Two cascading child tables; DataCite-shaped relations ride the sample document, attachments have their own routes and their blobs live on the server filesystem.

# practice

- [API trust boundary and security rules](api-trust-boundary-security.md) - api holds the only real boundary: every payload validated, authorization per resource, fields picked explicitly, responses shaped explicitly.
- [Compose parity across dev, e2e and preprod](infra-parity-rule.md) - A change to a service's runtime requirements lands in the dev, preprod and e2e compose files in the same change.
- [Development practices](dev-practices.md) - Laziest solution that works, docs read through Context7, dependencies only with explicit approval, ADRs only for costly-to-reverse decisions.
- [Form kit and the hidden-value lifecycle](form-kit-and-hidden-values.md) - Every form uses useAppForm with a domain Zod schema; a hidden value is kept while editing, dropped on save, cleared after.
- [i18n strategy](i18n-strategy.md) - Vocabularies are stored as codes and translated in domain; coverage fails the build, and the api mails resolve with i18next instead of Paraglide.
- [React and accessibility conventions](frontend-conventions.md) - React Compiler means no manual memoization; react-query owns server state, the URL owns shareable state, and the target is WCAG 2.1 AA.
- [Testing strategy](testing-strategy.md) - One test per domain rule, endpoints driven through the Hono app against a real Postgres, components in Vitest browser mode by accessible role with MSW.
- [Zod schemas as the single write contract](zod-single-source-of-truth.md) - createSampleSchema in domain is the one write contract; the admin form has no schema of its own and required means required to publish.

# project

- [IGSN registry](igsn-registry.md) - Registry assigning IGSN identifiers to geological samples, making them discoverable and reusable worldwide.

# reference

- [Commands and dev services](commands-and-services.md) - The makefile wraps the pnpm monorepo; dev runs the stack over docker-compose.dev.yml behind one Caddy origin on port 3000.

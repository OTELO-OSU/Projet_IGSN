# 0043. Public lineage visibility: permanent relatives, capped traversal

Date: 2026-09-15

## Status

Accepted. Carries the sub-sample lineage exception in [ADR 0033](0033-sample-tombstone-status.md)'s 2026-09-08 amendment forward onto the lineage graph.

## Context

`GET /samples/:igsn/lineage` walks a sample's ancestors and descendants for the public graph, the lineage itself coming from [ADR 0039](0039-two-parent-sub-samples.md). It replaces the flat parent list the public sample page used to render.

`sample_parent` carries no acyclicity constraint beyond `sample_id <> parent_id`, and the route is unauthenticated, so the traversal needs its own visibility and size rules rather than reusing `GET /samples/:igsn` as-is.

Two existing rules pull in opposite directions here.

- `status = 'published'` gates public visibility, and [ADR 0032](0032-sample-withdrawal-status.md)'s `toWithdrawnSample` is a whitelist that deliberately drops `parents`.
- ADR 0033's 2026-09-08 amendment is a product decision in the other direction: a published sub-sample's page names its parent and links to it whatever the parent's status, chosen over redacting the parent publicly, the parent's own page still answering 404.

## Decision

**Both directions: anything that left draft.** The walk filters on `status <> 'draft'`, the existing `hasPermanentIgsn` predicate, applied inline in SQL at every hop, upward and downward alike. A withdrawn or tombstoned relative is named in the graph, carrying the behaviour ADR 0033 chose for the parent list this graph replaced. A withdrawn node links to its own page, which resolves redacted; a tombstoned node is named without a link, since its page answers 404, so each node carries a `tombstone` flag for the graph to render. A sample that left draft has a permanent, citable IGSN, so naming it discloses nothing the identifier does not already assert, and the graph is the public record of what that identifier was cut from and cut into.

A draft relative stays absent and stops the walk, in both directions. Draft is unreleased work with no permanent identifier. `canDeclareSubSample` refuses a draft parent, so a draft ancestor can only exist as a row written directly to the database; excluding it explicitly keeps the rule true anyway.

**The root: whatever resolves publicly.** `status in ('published', 'withdrawn')`, the same pair `GET /samples/:igsn` answers, so a withdrawn sample's reduced page carries its graph too. A tombstoned sample gets a 404 and no graph of its own. Nothing is disclosed either way: the withdrawn sample's relatives already name it from their own graphs.

**Traversal is capped at 10 generations and 500 rows**, with a `truncated` flag on the response. `UNION` rather than `UNION ALL` inside each recursive CTE is load-bearing: without it a diamond (two paths reconverging, which ADR 0039 allows) revisits its own subtree once per path and fans out exponentially. The caps exist because the endpoint is unauthenticated and `sample_parent` alone does not rule out a cycle.

## Rejected

- **Published only, both directions.** Simpler to state and to test, and it was how this first shipped, but it silently reversed ADR 0033's product decision: a tombstoned parent vanished from its published child's page. Reversing a product ruling is the product owner's call, not a side effect of a new view.
- **Permanent ancestors, published descendants.** Shipped briefly, on the argument that a withdrawn child is work pulled back from publication the reader has no prior claim on. The product owner ruled otherwise: an IGSN is permanent and citable whichever way the edge points, so hiding a withdrawn child hides a real lineage step and leaves everything below it unreachable.
- **`UNION ALL`.** Simpler SQL, exponential on a diamond.

## Consequences

- The `tombstone` flag is public on every node of the graph, the price of never offering a link that 404s.
- `toWithdrawnSample` still drops `parents`, the graph being the one place a withdrawn sample names its relatives.
- A published sample reachable only through a draft relative does not appear on the graph.

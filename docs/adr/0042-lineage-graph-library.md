# 0042. Lineage graph library: React Flow

Date: 2026-09-15

## Status

Accepted.

## Context

The public sample page now shows a sample's lineage (ancestors and descendants) as a left-to-right graph. Unlike a tree, the lineage is a DAG: ADR 0039 lets a sample carry two parents, so two branches can converge on one node, and the centre grows in both directions at once. The repo had no graph library; this is the same class of choice as ADR 0028 (map stack), including an attribution constraint.

## Decision

Use **React Flow** (`@xyflow/react`, MIT). It renders nodes and edges as DOM/SVG, so a node stays a real `<Link>` with accessible text, and it does no layout of its own: `layout-lineage.ts` places each node at `x = generation` with a single-pass barycenter ordering within a level, which is all this shape needs.

The library is lazily imported so it stays out of the SSR bundle and off a sample page with no lineage.

**Rejected on data shape, not licensing:**

- `react-d3-tree` and `reagraph`'s `hierarchicalLr` layout both go through d3-hierarchy's `stratify`, which requires one root and one parent per node. A two-parent sample cannot be expressed as that input.
- `reagraph` (Apache-2.0) also renders in WebGL: node labels are textures, not DOM, so there is no real link and no screen-reader text, and it pulls in three.js.
- `d3-dag` and `dagre` are layout-only and solve a harder problem (arbitrary DAG layout) than this graph needs, since the x-axis here is already known (`x = generation`); no solver earns its weight.

**React Flow's attribution badge is kept.** Removing it is legal under the MIT license, but the maintainers ask that only Pro subscribers hide it, and the decision was to keep the badge rather than buy a subscription. This is visible on every sample page that has a lineage.

## Consequences

- `layout-lineage.ts` is the one place that positions nodes; a future layout change (e.g. vertical orientation) stays there, not in React Flow config.
- The React Flow attribution badge ships permanently unless a future decision buys the Pro plan.
- Lazy-importing the graph means a sample page with a lineage renders it a tick after hydration, same tradeoff ADR 0028 made for the map.

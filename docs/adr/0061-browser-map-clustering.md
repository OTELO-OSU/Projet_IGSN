# 0061. Browser map clustering

Date: 2026-10-14

## Status

Accepted.

## Context

The search map clustered on the server, so every zoom or pan re-requested `GET /samples/map` and the side list.

At 500,000 published samples a move cost about 3 s zoomed out, though the query itself had dropped from 2.9 s to 0.3 s.

## Decision

- `GET /samples/map/points` answers every published located match as columns of `internal_number` and a rounded `ST_PointOnSurface` point, once per filter set.
- The frontend clusters them with `supercluster` in a Web Worker (`map-cluster-worker.ts`, `use-map-clusters.ts`), so a zoom or pan sends no points request and the page stays responsive.
- `GET /samples/map/samples?numbers=` answers igsn, name and position for up to 500 published samples, for the single markers in view.
- The public list takes `withTotal=false`, which omits `meta.total`, and the map loads 20 cards per scroll (`MAP_LIST_PAGE_SIZE`) instead of 500.
- The side list header counts the points in view.
- The points route has its own 20/min per-IP budget, and the samples route shares `MAP_IP_BUDGET`.
- Caddy compresses responses (`encode zstd gzip`, `infra/Caddyfile` and `infra/stack/Caddyfile`), which the points payload needs.
- The architecture rule "never filter in the client" has this one stated exception: the map's point count and clustering.

### Rejected

- Server clustering, kept as the benchmark's "before": it was just benchmarked and tuned, and still costs a request per move.
- Vector tiles: they need a tile server and a second cache for a point set the browser can hold.

## Consequences

- The payload grows with the sample count, 4.9 MB gzip at 500,000.
- The count is by point while the list matches whole shapes, so a partly visible area can be listed under a "0 results" header.
- One points request peaks at up to 60 MB of api heap at 500,000, Postgres building the response as one JSON text, so 20 concurrent requests from one IP could reach about 1.2 GB.
- Follow-up when volume nears 500,000: cache the unfiltered response or cap concurrency.
- Markers appear about 4 s after the points arrive at 500,000, the index build running in the worker.

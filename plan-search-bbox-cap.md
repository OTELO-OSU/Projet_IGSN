# Cap the search map area at a quarter of the world

## Context

- On the public search map (`frontend`), a reader can draw a box covering the whole world (Shift+drag or two clicks), which filters nothing.
- Goal: refuse any box larger than ~25% of the Earth's surface, both in the UI (red draft, message) and in the API (`bbox` param).
- Decisions taken: refuse plus a message (not clamp); the API also drops an oversized `bbox`.
- `viewport` stays unlimited: the zoomed-out results map legitimately sends a world box, and `api/src/app.ts:110` reads it to pick the rate limit.

## Measure

- True spherical fraction of the box, one line, no dependency: `(widthDeg / 360) * (sin(north) - sin(south)) / 2`.
- `widthDeg` is `east - west`, or `360 - west + east` when `west > east` (dateline crossing, as `split-bbox.ts` treats it).
- Chosen over degree² because it is what "25% of the world" means, and it does not over-penalise high-latitude boxes.

## Changes

### domain: `packages/domain/src/sample/sample-validator.ts`

- Add `MAX_SEARCH_BBOX_WORLD_FRACTION = 0.25` and `searchBboxSchema = bboxSchema.refine(withinQuarterOfTheWorld, { message: "Bounding box larger than a quarter of the world" })`, the fraction helper private in the same file.
- `listSamplesQuerySchema.bbox`: `searchBboxSchema.optional().catch(undefined)`, so the API drops an oversized `bbox` like any invalid one; `viewport` keeps `bboxSchema`.
- `packages/domain/src/sample/core/core-list-samples-query.ts:68`: `bbox` uses `searchBboxSchema`, its `.meta` description naming the quarter-of-the-world cap; that contract already rejects an invalid bbox rather than dropping it, so an oversized one is rejected with the message above.
- Test in `sample-validator.spec.ts`: one `it.each` accepting boxes within the cap (incl. a dateline-crossing one), one `it.each` rejecting larger ones (whole world, a wide dateline-crossing box, a full-width hemisphere band).

### frontend: `packages/frontend/src/domain/samples/search-location-map.tsx`

- `parseBoundsList` uses `searchBboxSchema`, so an oversized bbox from a shared URL is neither drawn nor fitted.
- `RectangleDrawer` gains `onTooLarge: () => void`; in `end()`, when `searchBboxSchema.safeParse(formatBbox(...))` fails, call `onTooLarge()` instead of `onSelect`.
- While drawing, the draft `Rectangle` gets a red `pathOptions` color (named constant) once the formatted draft fails the same check.
- `SearchLocationMap` forwards `onTooLarge`.

### frontend: `lazy-location-map.tsx`

- `isTooLarge` state: set by `onTooLarge`, cleared on a successful select or a click on "Draw an area"; drawing mode stays on after a refusal so the reader can retry.
- Render `<p role="alert">{m.search_map_too_large()}</p>` under the hint when set.
- `packages/frontend/messages/en.json`: `"search_map_too_large": "This area is too large. Draw an area covering at most a quarter of the world."`

### frontend: `search-params.ts`

- `hasValidBbox` uses `searchBboxSchema`, so an oversized URL bbox is not sent.

## Tests

- `search-location-map.spec.tsx` (`RectangleDrawer`): drawing an oversized box calls `onTooLarge` and not `onSelect`; the existing `formatBbox` whole-world tests stay (formatting unchanged).
- `lazy-location-map.spec.tsx`: an oversized draw shows the alert; a following valid draw removes it.
- No api test: the route parses with `listSamplesQuerySchema`, covered in domain.

## Verification

- `pnpm test --project @projet-igsn/domain` and `--project @projet-igsn/frontend`.
- `pnpm lint:check --quiet`, `pnpm fmt:check`.
- Manual check on `make dev` (http://localhost:3000): a whole-world drag turns red and shows the message; a country-sized box searches; `/api/samples?bbox=-180,-90,180,90` returns the unfiltered list.
- `make test-e2e` once at the end.

## Cleanup

- Last step of the implementation: `git rm plan-search-bbox-cap.md`, in the final commit.

# 0016. Undetermined location requirement hides the location section

Date: 2026-07-17

## Status

Accepted. Amends the material-driven requirement table of ADR 0014.

## Context

`locationRequirement(material)` returned `required`, `optional` or
`forbidden`, and its consumers asked it at different moments:

- The admin form asked with the partial material path and hid the location
  section only for `forbidden`, so with no material at all it showed the
  section and treated "unknown" as optional.
- A bare `extraterrestrial_rock` returned `required`, although refining it to
  `returned_samples` makes the location optional.

The user could therefore edit a location before the material said how to
validate it, and the form's required marker disagreed with the publish
tooltip.

## Decision

Add a fourth state, `undetermined`: the (possibly partial) material path does
not settle the requirement yet. It is returned for a null material and for
any strict prefix of the returned-samples path (a bare
`extraterrestrial_rock`). Other partial paths already settle the answer
(every completion of `rock` requires a location) and keep returning it.

The admin form shows the location section only for `required` and `optional`.
`forbidden` and `undetermined` both hide it, and the compose step drops a
lingering location in both cases (hidden-value rule, ADR 0015).

`createSampleSchema` (forbidden case) and `samplePublishBlockers` (required
case, still evaluated only once the material is complete) are unchanged.

## Consequences

- A new sample asks no location question until the first material segment is
  picked.
- Clearing the material back to empty drops an already entered location on
  save, like switching to a synthetic material always did.

# 0016. Location shown by default, hidden only for a refused material

Date: 2026-07-17, amended 2026-08-31

## Status

Accepted. Amends the material-driven requirement table of ADR 0014.

## Context

`locationRequirement(material)` returned `required`, `optional` or `forbidden`, and its consumers asked it at different moments.

- The admin form asked with the partial material path and hid the location section only for `forbidden`, so with no material at all it showed the section and treated "unknown" as optional.
- A bare `extraterrestrial_rock` returned `required`, although refining it to `returned_samples` makes the location optional.

The user could therefore edit a location before the material said how to validate it, and the form's required marker disagreed with the publish tooltip.

### 2026-08-31 amendment

The original fix added a fourth state, `undetermined`, for a material path that does not settle the answer yet, so the location hid until the first material segment was picked. In practice that traded one bug for another: entering a location, then picking a material that resolved to `undetermined` or `forbidden`, silently dropped it.

## Decision

The gate is inverted instead of refined further. `locationRequirement`'s four states (`required`/`optional`/`forbidden`/`undetermined`) collapse into one predicate, `allowsLocation(material)` (`domain/sample/location/allows-location.ts`): the location shows by default, for any material including none chosen yet, and hides only for a material `allowsLocation` refuses (a synthetic material, or an extraterrestrial "returned sample").

The location also moved out of the Physical description tab into its own Location tab in the admin sample form, so hiding it hides a whole tab rather than a section.

## Consequences

- A new sample shows the Location tab immediately, with no material question gating it.
- `optional` and `undetermined` no longer exist: a material either allows a location or refuses one.
- Entering a location then picking a refusing material still drops it on save (ADR 0015), but the reverse case this ADR originally introduced `undetermined` for, an as-yet-unresolved material silently hiding an entered location, cannot happen: the location is visible unless the material actively refuses it.

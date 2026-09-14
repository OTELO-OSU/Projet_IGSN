import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

const SYNTHETIC_MATERIAL = "rock_and_sediment.synthetic_rock_mineral";

export const toTwoParentDefaults = (
  first: Sample,
  second: Sample,
): Partial<CreateSample> => ({
  material: SYNTHETIC_MATERIAL,
  parentIds: [first.id, second.id],
});

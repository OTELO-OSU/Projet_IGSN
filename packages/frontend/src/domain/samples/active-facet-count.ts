import { activeFacetKeys } from "@projet-igsn/domain/sample/search/facets";

export const activeFacetCount = (values: Record<string, unknown>): number =>
  activeFacetKeys(values).filter((key) => !key.endsWith("Unit")).length;

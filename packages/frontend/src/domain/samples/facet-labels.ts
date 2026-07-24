import {
  collectionMethodLabel,
  materialPathLabel,
  natureLabel,
  textureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

// The visible label for a facet (its declaration-schema field name). Reuses the
// shared sample field labels where one exists; the scientific-context author
// fields get their own facet keys.
export function facetLabel(key: string): string {
  switch (key) {
    case "type":
      return m.sample_field_type();
    case "material":
      return m.sample_field_material();
    case "collectionMethod":
      return m.sample_field_collection_method();
    case "nature":
      return m.sample_field_nature();
    case "texture":
      return m.sample_field_texture();
    case "researchProgramName":
      return m.facet_research_program_name();
    case "researchProgramChief":
      return m.facet_research_program_chief();
    case "researchCampaign":
      return m.facet_research_campaign();
    case "collectorName":
      return m.facet_collector_name();
    case "collectionCurator":
      return m.facet_collection_curator();
    case "age":
      return m.sample_section_age();
    default:
      return key;
  }
}

// The value-label resolver for a hierarchy or enum facet's options; identity for
// anything else (never called for text/range facets).
export function facetValueLabel(key: string): (code: string) => string {
  switch (key) {
    case "type":
      return typeLabel;
    case "material":
      return materialPathLabel;
    case "collectionMethod":
      return collectionMethodLabel;
    // The vocabulary resolvers accept any string at runtime; the facet cascade
    // only ever passes real codes, so the cast is safe.
    case "nature":
      return (code) => natureLabel(code as Parameters<typeof natureLabel>[0]);
    case "texture":
      return (code) => textureLabel(code as Parameters<typeof textureLabel>[0]);
    default:
      return (code) => code;
  }
}

import { m } from "#/paraglide/messages.js";

export const FACET_SECTIONS: readonly {
  title: () => string;
  keys: readonly string[];
}[] = [
  {
    title: m.sample_section_identity,
    keys: ["includeSubSamples", "type", "nature", "collectionMethod"],
  },
  {
    title: m.sample_section_classification,
    keys: ["material", "mineralClassification"],
  },
  { title: m.sample_section_age, keys: ["age"] },
  {
    title: m.sample_section_scientific_context,
    keys: [
      "collectorName",
      "chiefScientist",
      "hostInstitution",
      "researchProgramName",
    ],
  },
  {
    title: m.sample_section_declaration,
    keys: [
      "contributor",
      "manualGroup",
      "institutionalOrganization",
      "institutionalOsu",
      "institutionalLaboratory",
    ],
  },
];

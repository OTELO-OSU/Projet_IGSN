export const TEMPLATE_SECTION_KEYS = [
  "identity",
  "sampleClassification",
  "location",
  "geologicalContext",
  "age",
  "physicalDescription",
  "scientificContext",
  "conservationSecurity",
  "repository",
  "relatedDocuments",
] as const;

export type TemplateSectionKey = (typeof TEMPLATE_SECTION_KEYS)[number];

export const PARTLY_EXCLUDABLE_TEMPLATE_SECTIONS: readonly TemplateSectionKey[] =
  ["identity", "sampleClassification", "location", "scientificContext"];

export const TEMPLATE_FIELDS = [
  {
    key: "localId",
    section: "identity",
    paths: ["localId", "localIdDescription"],
  },
  { key: "collectionMethod", section: "identity", paths: ["collectionMethod"] },
  {
    key: "collectionMethodDescription",
    section: "identity",
    paths: ["collectionMethodDescription"],
  },
  {
    key: "collectionDate",
    section: "identity",
    paths: ["description.collectionDate"],
  },
  { key: "manualGroup", section: "identity", paths: ["manualGroupIds"] },
  { key: "texture", section: "sampleClassification", paths: ["texture"] },
  {
    key: "metamorphicFacies",
    section: "sampleClassification",
    paths: ["metamorphicFacies"],
  },
  {
    key: "metamorphicFabric",
    section: "sampleClassification",
    paths: ["metamorphicFabric"],
  },
  {
    key: "specificName",
    section: "sampleClassification",
    paths: ["specificName"],
  },
  {
    key: "resourceType",
    section: "sampleClassification",
    paths: ["resourceType", "economicResourceTypePrecision"],
  },
  {
    key: "depositName",
    section: "sampleClassification",
    paths: ["economicDepositName"],
  },
  {
    key: "depositDescription",
    section: "sampleClassification",
    paths: ["economicDepositDescription"],
  },
  {
    key: "elementsOfInterest",
    section: "sampleClassification",
    paths: ["economicInterestElements"],
  },
  { key: "position", section: "location", paths: ["location.position"] },
  {
    key: "navigationType",
    section: "location",
    paths: ["location.navigationType"],
  },
  { key: "region", section: "location", paths: ["location.region"] },
  {
    key: "localityName",
    section: "location",
    paths: ["location.localityName"],
  },
  {
    key: "localityDescription",
    section: "location",
    paths: ["location.localityDescription"],
  },
  {
    key: "verticalPositions",
    section: "location",
    paths: ["location.verticalPositions"],
  },
  {
    key: "geologicalContextDescription",
    section: "geologicalContext",
    paths: ["geologicalContextDescription"],
  },
  {
    key: "physiographicEnvironment",
    section: "geologicalContext",
    paths: ["physiographicEnvironment"],
  },
  {
    key: "numericAge",
    section: "age",
    paths: [
      "age.numericAgeMin",
      "age.numericAgeMax",
      "age.numericAgeUnit",
      "age.numericAgeYearsUnit",
    ],
  },
  {
    key: "geologicalAge",
    section: "age",
    paths: ["age.geologicalAgeMin", "age.geologicalAgeMax"],
  },
  { key: "geologicalUnit", section: "age", paths: ["age.geologicalUnit"] },
  {
    key: "openDescription",
    section: "physicalDescription",
    paths: ["description.openDescription"],
  },
  {
    key: "length",
    section: "physicalDescription",
    paths: ["description.length"],
  },
  {
    key: "width",
    section: "physicalDescription",
    paths: ["description.width"],
  },
  {
    key: "thickness",
    section: "physicalDescription",
    paths: ["description.thickness"],
  },
  { key: "mass", section: "physicalDescription", paths: ["description.mass"] },
  {
    key: "volume",
    section: "physicalDescription",
    paths: ["description.volume"],
  },
  {
    key: "orientation",
    section: "physicalDescription",
    paths: ["description.oriented", "description.orientationExplanation"],
  },
  {
    key: "collector",
    section: "scientificContext",
    paths: [
      "scientificContext.collectorFirstname",
      "scientificContext.collectorLastname",
    ],
  },
  {
    key: "chiefScientist",
    section: "scientificContext",
    paths: [
      "scientificContext.chiefScientistFirstname",
      "scientificContext.chiefScientistLastname",
    ],
  },
  {
    key: "funding",
    section: "scientificContext",
    paths: ["scientificContext.funding"],
  },
  {
    key: "funderOrganizations",
    section: "scientificContext",
    paths: ["scientificContext.funderOrganizations"],
  },
  {
    key: "researchProgramName",
    section: "scientificContext",
    paths: ["scientificContext.researchProgramName"],
  },
  {
    key: "researchProgramDescription",
    section: "scientificContext",
    paths: ["scientificContext.researchProgramDescription"],
  },
  {
    key: "hostInstitution",
    section: "scientificContext",
    paths: ["scientificContext.hostInstitution"],
  },
  {
    key: "platformType",
    section: "scientificContext",
    paths: ["scientificContext.platformType"],
  },
  {
    key: "launchPlatformName",
    section: "scientificContext",
    paths: ["scientificContext.launchPlatformName"],
  },
  {
    key: "collectionOrigin",
    section: "scientificContext",
    paths: ["scientificContext.collectionOrigin"],
  },
  {
    key: "collectionContextDescription",
    section: "scientificContext",
    paths: ["scientificContext.collectionContextDescription"],
  },
  {
    key: "additionalRoles",
    section: "scientificContext",
    paths: ["scientificContext.additionalRoles"],
  },
  {
    key: "packaging",
    section: "conservationSecurity",
    paths: ["condition.packaging"],
  },
  {
    key: "specificConditions",
    section: "conservationSecurity",
    paths: ["condition.specificConditions"],
  },
  {
    key: "radioactivity",
    section: "conservationSecurity",
    paths: ["security.radioactivity", "security.radioactivityExplanation"],
  },
  {
    key: "asbestos",
    section: "conservationSecurity",
    paths: ["security.asbestosRich", "security.asbestosExplanation"],
  },
  {
    key: "chemicalRisk",
    section: "conservationSecurity",
    paths: ["security.chemicalRisk", "security.chemicalRiskExplanation"],
  },
  {
    key: "storageConditions",
    section: "conservationSecurity",
    paths: [
      "condition.storageConditions",
      "condition.temperature",
      "condition.pressure",
      "condition.humidity",
      "condition.light",
    ],
  },
  {
    key: "curationStatus",
    section: "repository",
    paths: ["existenceStatus", "availabilityStatus"],
  },
  {
    key: "currentArchive",
    section: "repository",
    paths: [
      "repository.currentArchiveOsu",
      "repository.currentArchiveLaboratory",
    ],
  },
  {
    key: "collectionName",
    section: "repository",
    paths: ["repository.collectionName"],
  },
  {
    key: "currentArchiveContact",
    section: "repository",
    paths: [
      "repository.currentArchiveContactFirstname",
      "repository.currentArchiveContactLastname",
      "repository.currentArchiveContactEmail",
    ],
  },
  {
    key: "rightsHolder",
    section: "repository",
    paths: ["repository.rightsHolder"],
  },
  { key: "relations", section: "relatedDocuments", paths: ["relations"] },
  { key: "attachments", section: "relatedDocuments", paths: ["attachments"] },
] as const satisfies readonly {
  key: string;
  section: TemplateSectionKey;
  paths: readonly string[];
}[];

export type TemplateFieldKey = (typeof TEMPLATE_FIELDS)[number]["key"];

export const TEMPLATE_FIELD_KEYS = TEMPLATE_FIELDS.map(({ key }) => key);

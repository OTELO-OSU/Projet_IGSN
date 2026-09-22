const CORE_PATH_BY_FIELD: Record<string, string> = {
  igsn: "identification.sampleIdentifier",
  name: "identification.titles.0.value",
  specificName: "identification.localName",
  publicationYear: "publication.publicationYear",

  nature: "classification.natureOfSample",
  type: "classification.sampleObjectTypes.0",
  material: "classification.contextCategories",
  materialOtherName: "classification.contextCategories",
  texture: "classification.contextCategories",
  metamorphicFacies: "classification.contextCategories",
  metamorphicFabric: "classification.contextCategories",
  physiographicEnvironment: "classification.contextCategories",
  resourceType: "classification.contextCategories",
  geologicalContextDescription: "classification.contextCategories",

  collectionMethod: "production.collectionMethod",
  collectionMethodDescription: "production.collectionMethodDescription",
  "description.collectionDate": "production.collection_date_start",

  description: "physicalDescription",
  "description.oriented": "physicalDescription.orientation.oriented",
  "description.orientationExplanation":
    "physicalDescription.orientation.description",
  "description.openDescription": "physicalDescription.openPhysicalDescription",
  "description.length": "physicalDescription.dimensions.length",
  "description.width": "physicalDescription.dimensions.width",
  "description.thickness": "physicalDescription.dimensions.thickness",
  "description.mass": "physicalDescription.mass",
  "description.volume": "physicalDescription.volume",

  location: "production.location",
  "location.position": "production.location.geometry",
  "location.position.vertical": "production.location.verticalExtent",
  "location.region": "production.location",
  "location.navigationType": "production.location.navigationMethod",
  "location.localityName": "production.location.placeNames.0",
  "location.localityDescription": "production.location.locationDescription",

  existenceStatus: "curation.existenceStatus",
  availabilityStatus: "curation.availabilityStatus",
  repository: "curation",
  "repository.currentArchive": "curation.currentRepository.organization",
  "repository.currentArchiveContactFirstname":
    "curation.currentRepository.contactFirstName",
  "repository.currentArchiveContactLastname":
    "curation.currentRepository.contactLastName",
  "repository.collectionName": "curation.currentRepository.collectionName",
  "repository.originalArchive": "curation.originalRepository.organization.name",
  "repository.originalArchiveContactFirstname":
    "curation.originalRepository.contactFirstName",
  "repository.originalArchiveContactLastname":
    "curation.originalRepository.contactLastName",

  condition: "curation.sampleCondition",
  "condition.storageConditions": "curation.sampleCondition.storageCondition",
  "condition.temperature": "curation.sampleCondition.temperature",
  "condition.humidity": "curation.sampleCondition.humidityType",
  "condition.humidity.percentage":
    "curation.sampleCondition.relativeHumidityPercent",
  "condition.pressure": "curation.sampleCondition.pressure",
  "condition.light": "curation.sampleCondition.lightCondition",
  "condition.packaging": "curation.sampleCondition.packaging",
  "condition.specificConditions": "curation.sampleCondition.description",

  scientificContext: "classification.contextCategories",
  "scientificContext.collectorFirstname": "responsibility",
  "scientificContext.collectorLastname": "responsibility",
  "scientificContext.collectorOrcid": "responsibility",
  "scientificContext.chiefScientistFirstname": "responsibility",
  "scientificContext.chiefScientistLastname": "responsibility",
  "scientificContext.chiefScientistOrcid": "responsibility",
  "scientificContext.hostInstitution": "responsibility",
  "scientificContext.collectionCuratorFirstname": "responsibility",
  "scientificContext.collectionCuratorLastname": "responsibility",
  "scientificContext.missionDescription": "production.samplingPurpose",
  "scientificContext.fieldName": "production.samplingSite_name",
  "scientificContext.researchProgramName": "production.projects.0.name",
  "scientificContext.funderOrganizations":
    "production.projects.0.fundingReferences",
  "scientificContext.funding": "production.projects.0.funding",
  "scientificContext.researchProgramDescription":
    "production.projects.0.description",
  "scientificContext.researchCampaign": "production.projects.0.campaign",

  syntheticDetails: "extensions.experiment",
  "syntheticDetails.startingMaterial": "extensions.experiment.startingMaterial",
  "syntheticDetails.startingMaterialNature":
    "extensions.experiment.startingMaterialNature",
  "syntheticDetails.startingMaterialComposition":
    "extensions.experiment.startingMaterialComposition",
  "syntheticDetails.finalProduct": "extensions.experiment.finalProduct",
  "syntheticDetails.experimentType": "extensions.experiment.experimentType",
  "syntheticDetails.experimentDuration": "extensions.experiment.duration",
  "syntheticDetails.temperature": "extensions.experiment.temperature",
  "syntheticDetails.pressure": "extensions.experiment.pressure",
  "syntheticDetails.experimentPurpose": "extensions.experiment.purpose",
  "syntheticDetails.equipmentUsed": "extensions.experiment.equipment",
  "syntheticDetails.experimentalProtocol":
    "production.processSteps.0.description",
  "syntheticDetails.synthesisDate": "production.processSteps.0.timestampStart",
  "syntheticDetails.operatorFirstname": "responsibility",
  "syntheticDetails.operatorLastname": "responsibility",
  "syntheticDetails.operatorOrcid": "responsibility",
  "syntheticDetails.researchStructure": "responsibility",

  age: "extensions.geology",
  "age.numericAgeMin": "extensions.geology.numericAge.min",
  "age.numericAgeMax": "extensions.geology.numericAge.max",
  "age.numericAgeUnit": "extensions.geology.numericAge.unit",
  "age.numericAgeYearsUnit": "extensions.geology.numericAge.era",
  "age.geologicalAgeMin": "extensions.geology.chronostratigraphy.min",
  "age.geologicalAgeMax": "extensions.geology.chronostratigraphy.max",
  "age.geologicalUnit": "extensions.geology.chronostratigraphy.unit",

  economicDepositName: "extensions.geology.economic.depositName",
  economicDepositDescription: "extensions.geology.economic.depositDescription",
  economicResourceTypePrecision:
    "extensions.geology.economic.resourceTypePrecision",
  economicInterestElements: "extensions.geology.economic.interestElements",

  "security.radioactivity": "extensions.safety.radioactivity.flag",
  "security.radioactivityExplanation":
    "extensions.safety.radioactivity.explanation",
  "security.asbestosRich": "extensions.safety.asbestos.flag",
  "security.asbestosExplanation": "extensions.safety.asbestos.explanation",
  "security.chemicalRisk": "extensions.safety.chemical.flag",
  "security.chemicalRiskExplanation": "extensions.safety.chemical.explanation",
  security: "extensions.safety",

  // ponytail: the index ignores the synthesis step Core emits first, so it is off by one on a synthetic sub-sample; thread the sample through toCorePath if a client needs it exact
  processSteps: "production.processSteps",

  relations: "relations",
  parentIds: "relations",
  manualGroupIds: "manualGroups",
};

const INDEX = /^\d+$/;

export function toCorePath(path: readonly PropertyKey[] | string): string {
  const segments = (
    typeof path === "string" ? path.split(".") : path.map(String)
  ).filter((segment) => segment !== "");
  for (let length = segments.length; length > 0; length--) {
    const corePath = CORE_PATH_BY_FIELD[segments.slice(0, length).join(".")];
    if (corePath == null) continue;
    const indexes = [];
    for (const segment of segments.slice(length)) {
      if (!INDEX.test(segment)) break;
      indexes.push(segment);
    }
    return [corePath, ...indexes].join(".");
  }
  // ponytail: an unmapped internal path travels out as is, add an entry when a route emits one
  return segments.join(".");
}

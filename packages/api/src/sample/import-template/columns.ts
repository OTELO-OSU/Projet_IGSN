import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";

export const COLUMN_GROUPS = [
  "Sample",
  "Identity",
  "Sample classification",
  "Location",
  "Age",
  "Physical description",
  "Scientific context",
  "Conservation and security",
  "Curation and repository",
  "Related URL or document",
] as const;

export type ColumnGroup = (typeof COLUMN_GROUPS)[number];

export type Column = {
  header: string;
  group: ColumnGroup;
  path?: string;
  covers?: readonly string[];
  block?: string;
  level?: number;
};

type UngroupedColumn = Omit<Column, "group">;

export const TEMPLATE_VERSION = "1";

export const DEFAULT_TEMPLATE_ROWS = 2000;

export const MAX_TEMPLATE_ROWS = 20000;

export const SHEETS = {
  readMe: "Read me",
  samples: "Samples",
  relations: "Relations",
  additionalRoles: "Additional roles",
  funderOrganizations: "Funder organizations",
  hostInstitutions: "Host institutions",
  rightsHolders: "Rights holders",
  elementsOfInterest: "Elements of interest",
  storageConditions: "Storage conditions",
  vocabularies: "Vocabularies",
} as const;

export const SAMPLE_KEY_HEADER = "Sample #";

export const SAMPLE_NAME_HEADER = "Name";

export const SAMPLE_LOOKUP_HEADER = "Sample name (filled automatically)";

export const DEFERRED_FIELDS = [
  "parentIds",
  "processSteps",
  "syntheticDetails",
  "attachments",
] as const;

// TODO(phase 3): these carry a uuid a researcher cannot type; drop them from this list once the importer resolves people and groups by name.
export const IDENTIFIER_ONLY_FIELDS = [
  "manualGroupIds",
  "scientificContext.chiefScientistUserId",
  "scientificContext.collectorUserId",
  "scientificContext.additionalRoles.personUserId",
] as const;

export const REQUIRED_MARKER = " *";

const PUBLISH_REQUIRED_PATHS = new Set(
  Object.values(PUBLISH_BLOCKER_PATH).map((path) => path.join(".")),
);

const marked = (columns: readonly Column[]): readonly Column[] =>
  columns.map((column) =>
    column.path !== undefined &&
    PUBLISH_REQUIRED_PATHS.has(column.path) &&
    (column.level ?? 1) === 1
      ? { ...column, header: `${column.header}${REQUIRED_MARKER}` }
      : column,
  );

const grouped = (
  group: ColumnGroup,
  columns: readonly UngroupedColumn[],
): Column[] => columns.map((column) => ({ ...column, group }));

const free = (header: string, path: string): UngroupedColumn => ({
  header,
  path,
});

const list = (
  header: string,
  path: string,
  block: string,
): UngroupedColumn => ({
  header,
  path,
  block,
});

const tree = (
  path: string,
  block: string,
  title: string,
  levels: number,
): UngroupedColumn[] =>
  Array.from({ length: levels }, (_, index) => ({
    header: `${title} (level ${index + 1})`,
    path,
    block,
    level: index + 1,
  }));

export const SAMPLE_COLUMNS: readonly Column[] = marked([
  ...grouped("Sample", [{ header: SAMPLE_KEY_HEADER }]),
  ...grouped("Identity", [
    free(SAMPLE_NAME_HEADER, "name"),
    free("Local ID", "localId"),
    free("Local ID description", "localIdDescription"),
    ...tree("type", "sample_type", "Sample type", 2),
    list("Nature", "nature", "nature"),
    ...tree("collectionMethod", "collection_method", "Collection method", 3),
    free("Collection method description", "collectionMethodDescription"),
    list(
      "Provenance status",
      "scientificContext.provenanceStatus",
      "provenance_status",
    ),
    list(
      "Collection date precision",
      "description.collectionDate.precision",
      "date_precision",
    ),
    free("Collection date start", "description.collectionDate.start"),
    free("Collection date end", "description.collectionDate.end"),
    free("Collection date time zone", "description.collectionDate.timeZone"),
  ]),
  ...grouped("Sample classification", [
    ...tree("material", "material", "Material", 9),
    free("Other material name", "materialOtherName"),
    list("Texture", "texture", "texture"),
    list("Metamorphic facies", "metamorphicFacies", "metamorphic_facies"),
    list("Metamorphic fabrics", "metamorphicFabric", "metamorphic_fabric"),
    free("Specific name", "specificName"),
    ...tree("resourceType", "resource_type", "Resource type", 3),
    free("Resource type details", "economicResourceTypePrecision"),
    free("Deposit name", "economicDepositName"),
    free("Deposit description", "economicDepositDescription"),
  ]),
  ...grouped("Location", [
    list("Position type", "location.position.type", "position_type"),
    free("Longitude", "location.position.longitude"),
    free("Latitude", "location.position.latitude"),
    free("Vertical position", "location.position.vertical.position"),
    free("West longitude", "location.position.westLongitude"),
    free("South latitude", "location.position.southLatitude"),
    free("Minimum vertical position", "location.position.vertical.min"),
    free("East longitude", "location.position.eastLongitude"),
    free("North latitude", "location.position.northLatitude"),
    free("Maximum vertical position", "location.position.vertical.max"),
    free("Start longitude", "location.position.startLongitude"),
    free("Start latitude", "location.position.startLatitude"),
    free("Start vertical position", "location.position.vertical.start"),
    free("End longitude", "location.position.endLongitude"),
    free("End latitude", "location.position.endLatitude"),
    free("End vertical position", "location.position.vertical.end"),
    list(
      "Vertical reference",
      "location.position.vertical.reference",
      "vertical_reference",
    ),
    list(
      "Vertical reference system",
      "location.position.vertical.system",
      "vertical_reference_system",
    ),
    list("Navigation type", "location.navigationType", "navigation_type"),
    {
      header: "Region (level 1)",
      path: "location.region.kind",
      block: "region",
      level: 1,
    },
    {
      header: "Region (level 2)",
      path: "location.region.country",
      covers: ["location.region.oceanSea"],
      block: "region",
      level: 2,
    },
    free("Locality name", "location.localityName"),
    free("Locality description", "location.localityDescription"),
    free("Geological context description", "geologicalContextDescription"),
    ...tree(
      "physiographicEnvironment",
      "physiographic_environment",
      "Physiographic environment",
      2,
    ),
  ]),
  ...grouped("Age", [
    free("Numeric age minimum", "age.numericAgeMin"),
    free("Numeric age maximum", "age.numericAgeMax"),
    list("Numeric age units", "age.numericAgeUnit", "age_numeric_unit"),
    list("Numeric age reference", "age.numericAgeYearsUnit", "age_years_unit"),
    list(
      "Geological age (min) time scale",
      "age.geologicalAgeMin",
      "geological_age",
    ),
    list(
      "Geological age (max) time scale",
      "age.geologicalAgeMax",
      "geological_age",
    ),
    free("Geological unit", "age.geologicalUnit"),
  ]),
  ...grouped("Physical description", [
    free("Open description", "description.openDescription"),
    free("Length", "description.length.value"),
    list("Length unit", "description.length.unit", "size_unit"),
    free("Width", "description.width.value"),
    list("Width unit", "description.width.unit", "size_unit"),
    free("Thickness", "description.thickness.value"),
    list("Thickness unit", "description.thickness.unit", "size_unit"),
    free("Mass", "description.mass.value"),
    list("Mass unit", "description.mass.unit", "mass_unit"),
    free("Volume", "description.volume.value"),
    list("Volume unit", "description.volume.unit", "volume_unit"),
    list("Oriented sample", "description.oriented", "yes_no"),
    free("Orientation explanation", "description.orientationExplanation"),
  ]),
  ...grouped("Scientific context", [
    free("Collector first name", "scientificContext.collectorFirstname"),
    free("Collector last name", "scientificContext.collectorLastname"),
    free(
      "Chief scientist first name",
      "scientificContext.chiefScientistFirstname",
    ),
    free(
      "Chief scientist last name",
      "scientificContext.chiefScientistLastname",
    ),
    free("Funding", "scientificContext.funding"),
    free(
      "Name of the research programme",
      "scientificContext.researchProgramName",
    ),
    free(
      "Open description of the research programme",
      "scientificContext.researchProgramDescription",
    ),
    list("Platform type", "scientificContext.platformType", "platform_type"),
    free("Launch platform name", "scientificContext.launchPlatformName"),
    list(
      "Collection origin",
      "scientificContext.collectionOrigin",
      "collection_origin",
    ),
    free(
      "Open description of the collection context",
      "scientificContext.collectionContextDescription",
    ),
  ]),
  ...grouped("Conservation and security", [
    list("Packaging", "condition.packaging", "packaging"),
    free("Specific sample conditions", "condition.specificConditions"),
    list("Radioactivity", "security.radioactivity", "yes_no"),
    free("Radioactivity explanation", "security.radioactivityExplanation"),
    list("Asbestos-rich", "security.asbestosRich", "yes_no"),
    free("Asbestos explanation", "security.asbestosExplanation"),
    list("Chemical risk", "security.chemicalRisk", "yes_no"),
    free("Chemical risk explanation", "security.chemicalRiskExplanation"),
  ]),
  ...grouped("Curation and repository", [
    list("Existence status", "existenceStatus", "existence_status"),
    list("Availability status", "availabilityStatus", "availability_status"),
    list("Current archive OSU", "repository.currentArchiveOsu", "osu"),
    list(
      "Current archive UMR",
      "repository.currentArchiveLaboratory",
      "laboratory",
    ),
    free("Collection name", "repository.collectionName"),
    free(
      "Current archive contact first name",
      "repository.currentArchiveContactFirstname",
    ),
    free(
      "Current archive contact last name",
      "repository.currentArchiveContactLastname",
    ),
  ]),
]);

const nested = (
  header: string,
  prefix: string,
  name: string,
  block?: string,
): UngroupedColumn => ({
  header,
  path: `${prefix}.${name}`,
  block,
});

const KEY_COLUMNS = grouped("Sample", [
  { header: SAMPLE_KEY_HEADER },
  { header: SAMPLE_LOOKUP_HEADER },
]);

const RELATION = "relations";

const RELATION_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Related URL or document", [
    nested("Identifier type", RELATION, "identifierType", "identifier_type"),
    nested("Identifier", RELATION, "identifier"),
    nested("Title", RELATION, "targetTitle"),
    nested("Relation type", RELATION, "relationType", "relation_type"),
    nested(
      "Resource type",
      RELATION,
      "targetResourceType",
      "relation_resource_type",
    ),
    nested("Metadata scheme", RELATION, "relatedMetadataScheme"),
    nested("Scheme URI", RELATION, "schemeURI"),
    nested("Scheme type", RELATION, "schemeType"),
    nested("Description", RELATION, "description"),
  ]),
]);

const ADDITIONAL_ROLE = "scientificContext.additionalRoles";

const ADDITIONAL_ROLE_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Scientific context", [
    nested("Role", ADDITIONAL_ROLE, "role", "additional_role"),
    nested("First name", ADDITIONAL_ROLE, "personFirstname"),
    nested("Last name", ADDITIONAL_ROLE, "personLastname"),
  ]),
]);

const valueSheet = (
  name: string,
  group: ColumnGroup,
  header: string,
  path: string,
  block: string,
) => ({
  name,
  columns: marked([
    ...KEY_COLUMNS,
    ...grouped(group, [list(header, path, block)]),
  ]),
});

const STORAGE_CONDITION_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Conservation and security", [
    list(
      "Storage condition",
      "condition.storageConditions",
      "storage_condition",
    ),
    list("Temperature", "condition.temperature.type", "temperature_type"),
    free("Temperature value", "condition.temperature.measurement.value"),
    list(
      "Temperature unit",
      "condition.temperature.measurement.unit",
      "temperature_unit",
    ),
    list("Pressure", "condition.pressure.type", "pressure_type"),
    free("Pressure value", "condition.pressure.measurement.value"),
    list(
      "Pressure unit",
      "condition.pressure.measurement.unit",
      "pressure_unit",
    ),
    list("Relative humidity", "condition.humidity.type", "humidity_type"),
    free("Relative humidity in %", "condition.humidity.percentage"),
    list("Light", "condition.light", "light"),
  ]),
]);

export const CHILD_SHEETS: readonly {
  name: string;
  columns: readonly Column[];
}[] = [
  { name: SHEETS.relations, columns: RELATION_COLUMNS },
  { name: SHEETS.additionalRoles, columns: ADDITIONAL_ROLE_COLUMNS },
  valueSheet(
    SHEETS.funderOrganizations,
    "Scientific context",
    "Funder organization",
    "scientificContext.funderOrganizations",
    "organization",
  ),
  valueSheet(
    SHEETS.hostInstitutions,
    "Scientific context",
    "Host institution (project leader)",
    "scientificContext.hostInstitution",
    "organization",
  ),
  valueSheet(
    SHEETS.rightsHolders,
    "Curation and repository",
    "Rights holder",
    "repository.rightsHolder",
    "organization",
  ),
  valueSheet(
    SHEETS.elementsOfInterest,
    "Sample classification",
    "Chemical element of interest",
    "economicInterestElements",
    "element",
  ),
  { name: SHEETS.storageConditions, columns: STORAGE_CONDITION_COLUMNS },
];

export const DATA_SHEETS: readonly {
  name: string;
  columns: readonly Column[];
}[] = [{ name: SHEETS.samples, columns: SAMPLE_COLUMNS }, ...CHILD_SHEETS];

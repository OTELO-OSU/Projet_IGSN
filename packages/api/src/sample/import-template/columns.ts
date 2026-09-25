import { COLLECTION_METHODS } from "@projet-igsn/domain/sample/collection-method/vocabulary";
import { MATERIAL_PATHS } from "@projet-igsn/domain/sample/material/classification";
import { PHYSIOGRAPHIC_ENVIRONMENTS } from "@projet-igsn/domain/sample/physiographic-environment/vocabulary";
import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";
import { RESOURCE_TYPE_PATHS } from "@projet-igsn/domain/sample/resource-type/vocabulary";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { SAMPLE_TYPES } from "@projet-igsn/domain/sample/type/vocabulary";

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
  block?: string;
  level?: number;
};

type UngroupedColumn = Omit<Column, "group">;

export const TEMPLATE_VERSION = "1";

export const MAX_IMPORT_ROWS = 500;

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

const field = (
  header: string,
  path: string,
  block?: string,
): UngroupedColumn => ({
  header,
  path,
  block,
});

export const TEMPLATE_MATERIAL_PATHS = MATERIAL_PATHS.filter(
  (path) => !isSyntheticMaterial(path),
);

export const depthOf = (paths: readonly string[]) =>
  Math.max(...paths.map((path) => path.split(".").length));

const tree = (
  path: string,
  block: string,
  title: string,
  paths: readonly string[],
): UngroupedColumn[] =>
  Array.from({ length: depthOf(paths) }, (_, index) => ({
    header: `${title} (level ${index + 1})`,
    path,
    block,
    level: index + 1,
  }));

export const SAMPLE_COLUMNS: readonly Column[] = marked([
  ...grouped("Sample", [{ header: SAMPLE_KEY_HEADER }]),
  ...grouped("Identity", [
    field(SAMPLE_NAME_HEADER, "name"),
    field("Local ID", "localId"),
    field("Local ID description", "localIdDescription"),
    ...tree("type", "sample_type", "Sample type", SAMPLE_TYPES),
    field("Nature", "nature", "nature"),
    ...tree(
      "collectionMethod",
      "collection_method",
      "Collection method",
      COLLECTION_METHODS,
    ),
    field("Collection method description", "collectionMethodDescription"),
    field(
      "Provenance status",
      "scientificContext.provenanceStatus",
      "provenance_status",
    ),
    field(
      "Collection date precision",
      "description.collectionDate.precision",
      "date_precision",
    ),
    field("Collection date start", "description.collectionDate.start"),
    field("Collection date end", "description.collectionDate.end"),
    field("Collection date time zone", "description.collectionDate.timeZone"),
  ]),
  ...grouped("Sample classification", [
    ...tree("material", "material", "Material", TEMPLATE_MATERIAL_PATHS),
    field("Other material name", "materialOtherName"),
    field("Texture", "texture", "texture"),
    field("Metamorphic facies", "metamorphicFacies", "metamorphic_facies"),
    field("Metamorphic fabrics", "metamorphicFabric", "metamorphic_fabric"),
    field("Specific name", "specificName"),
    ...tree(
      "resourceType",
      "resource_type",
      "Resource type",
      RESOURCE_TYPE_PATHS,
    ),
    field("Resource type details", "economicResourceTypePrecision"),
    field("Deposit name", "economicDepositName"),
    field("Deposit description", "economicDepositDescription"),
  ]),
  ...grouped("Location", [
    field("Position type", "location.position.type", "position_type"),
    field("Longitude", "location.position.longitude"),
    field("Latitude", "location.position.latitude"),
    field("Vertical position", "location.position.vertical.position"),
    field("West longitude", "location.position.westLongitude"),
    field("South latitude", "location.position.southLatitude"),
    field("Minimum vertical position", "location.position.vertical.min"),
    field("East longitude", "location.position.eastLongitude"),
    field("North latitude", "location.position.northLatitude"),
    field("Maximum vertical position", "location.position.vertical.max"),
    field("Start longitude", "location.position.startLongitude"),
    field("Start latitude", "location.position.startLatitude"),
    field("Start vertical position", "location.position.vertical.start"),
    field("End longitude", "location.position.endLongitude"),
    field("End latitude", "location.position.endLatitude"),
    field("End vertical position", "location.position.vertical.end"),
    field(
      "Vertical reference",
      "location.position.vertical.reference",
      "vertical_reference",
    ),
    field(
      "Vertical reference system",
      "location.position.vertical.system",
      "vertical_reference_system",
    ),
    field("Navigation type", "location.navigationType", "navigation_type"),
    {
      header: "Region (level 1)",
      path: "location.region.kind",
      block: "region",
      level: 1,
    },
    {
      header: "Region (level 2)",
      path: "location.region.country",
      block: "region",
      level: 2,
    },
    field("Locality name", "location.localityName"),
    field("Locality description", "location.localityDescription"),
    field("Geological context description", "geologicalContextDescription"),
    ...tree(
      "physiographicEnvironment",
      "physiographic_environment",
      "Physiographic environment",
      PHYSIOGRAPHIC_ENVIRONMENTS,
    ),
  ]),
  ...grouped("Age", [
    field("Numeric age minimum", "age.numericAgeMin"),
    field("Numeric age maximum", "age.numericAgeMax"),
    field("Numeric age units", "age.numericAgeUnit", "age_numeric_unit"),
    field("Numeric age reference", "age.numericAgeYearsUnit", "age_years_unit"),
    field(
      "Geological age (min) time scale",
      "age.geologicalAgeMin",
      "geological_age",
    ),
    field(
      "Geological age (max) time scale",
      "age.geologicalAgeMax",
      "geological_age",
    ),
    field("Geological unit", "age.geologicalUnit"),
  ]),
  ...grouped("Physical description", [
    field("Open description", "description.openDescription"),
    field("Length", "description.length.value"),
    field("Length unit", "description.length.unit", "size_unit"),
    field("Width", "description.width.value"),
    field("Width unit", "description.width.unit", "size_unit"),
    field("Thickness", "description.thickness.value"),
    field("Thickness unit", "description.thickness.unit", "size_unit"),
    field("Mass", "description.mass.value"),
    field("Mass unit", "description.mass.unit", "mass_unit"),
    field("Volume", "description.volume.value"),
    field("Volume unit", "description.volume.unit", "volume_unit"),
    field("Oriented sample", "description.oriented", "yes_no"),
    field("Orientation explanation", "description.orientationExplanation"),
  ]),
  ...grouped("Scientific context", [
    field("Collector first name", "scientificContext.collectorFirstname"),
    field("Collector last name", "scientificContext.collectorLastname"),
    field(
      "Chief scientist first name",
      "scientificContext.chiefScientistFirstname",
    ),
    field(
      "Chief scientist last name",
      "scientificContext.chiefScientistLastname",
    ),
    field("Funding", "scientificContext.funding"),
    field(
      "Name of the research programme",
      "scientificContext.researchProgramName",
    ),
    field(
      "Open description of the research programme",
      "scientificContext.researchProgramDescription",
    ),
    field("Platform type", "scientificContext.platformType", "platform_type"),
    field("Launch platform name", "scientificContext.launchPlatformName"),
    field(
      "Collection origin",
      "scientificContext.collectionOrigin",
      "collection_origin",
    ),
    field(
      "Open description of the collection context",
      "scientificContext.collectionContextDescription",
    ),
  ]),
  ...grouped("Conservation and security", [
    field("Packaging", "condition.packaging", "packaging"),
    field("Specific sample conditions", "condition.specificConditions"),
    field("Radioactivity", "security.radioactivity", "yes_no"),
    field("Radioactivity explanation", "security.radioactivityExplanation"),
    field("Asbestos-rich", "security.asbestosRich", "yes_no"),
    field("Asbestos explanation", "security.asbestosExplanation"),
    field("Chemical risk", "security.chemicalRisk", "yes_no"),
    field("Chemical risk explanation", "security.chemicalRiskExplanation"),
  ]),
  ...grouped("Curation and repository", [
    field("Existence status", "existenceStatus", "existence_status"),
    field("Availability status", "availabilityStatus", "availability_status"),
    field("Current archive OSU", "repository.currentArchiveOsu", "osu"),
    field(
      "Current archive UMR",
      "repository.currentArchiveLaboratory",
      "laboratory",
    ),
    field("Collection name", "repository.collectionName"),
    field(
      "Current archive contact first name",
      "repository.currentArchiveContactFirstname",
    ),
    field(
      "Current archive contact last name",
      "repository.currentArchiveContactLastname",
    ),
  ]),
]);

const KEY_COLUMNS = grouped("Sample", [
  { header: SAMPLE_KEY_HEADER },
  { header: SAMPLE_LOOKUP_HEADER },
]);

const RELATION = "relations";

const RELATION_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Related URL or document", [
    field("Identifier type", `${RELATION}.identifierType`, "identifier_type"),
    field("Identifier", `${RELATION}.identifier`),
    field("Title", `${RELATION}.targetTitle`),
    field("Relation type", `${RELATION}.relationType`, "relation_type"),
    field(
      "Resource type",
      `${RELATION}.targetResourceType`,
      "relation_resource_type",
    ),
    field("Metadata scheme", `${RELATION}.relatedMetadataScheme`),
    field("Scheme URI", `${RELATION}.schemeURI`),
    field("Scheme type", `${RELATION}.schemeType`),
    field("Description", `${RELATION}.description`),
  ]),
]);

const ADDITIONAL_ROLE = "scientificContext.additionalRoles";

const ADDITIONAL_ROLE_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Scientific context", [
    field("Role", `${ADDITIONAL_ROLE}.role`, "additional_role"),
    field("First name", `${ADDITIONAL_ROLE}.personFirstname`),
    field("Last name", `${ADDITIONAL_ROLE}.personLastname`),
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
    ...grouped(group, [field(header, path, block)]),
  ]),
});

const STORAGE_CONDITION_COLUMNS: readonly Column[] = marked([
  ...KEY_COLUMNS,
  ...grouped("Conservation and security", [
    field(
      "Storage condition",
      "condition.storageConditions",
      "storage_condition",
    ),
    field("Temperature", "condition.temperature.type", "temperature_type"),
    field("Temperature value", "condition.temperature.measurement.value"),
    field(
      "Temperature unit",
      "condition.temperature.measurement.unit",
      "temperature_unit",
    ),
    field("Pressure", "condition.pressure.type", "pressure_type"),
    field("Pressure value", "condition.pressure.measurement.value"),
    field(
      "Pressure unit",
      "condition.pressure.measurement.unit",
      "pressure_unit",
    ),
    field("Relative humidity", "condition.humidity.type", "humidity_type"),
    field("Relative humidity in %", "condition.humidity.percentage"),
    field("Light", "condition.light", "light"),
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

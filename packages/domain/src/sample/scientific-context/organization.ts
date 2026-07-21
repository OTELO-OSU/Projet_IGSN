import { z } from "zod";

// Research organizations with their ROR identifier (Research Organization
// Registry), the internal reference list PY maintains. A sample's funder
// organization and the program chief's research structure both reference an
// organization by its ROR id; the id is the stable code, the name/acronym are
// display data (proper nouns, not translated, so not in the i18n catalog).
//
// Generated from a CSV export; do not edit by hand for bulk changes. Regenerate
// with: pnpm -F @projet-igsn/domain generate-organizations path/to/orgs.csv
// A one-off addition can be appended to ORGANIZATIONS directly (keep ROR ids
// unique). Promote to a DB table only if orgs must be editable at runtime.
export type Organization = {
  ror: string;
  name: string;
  acronym: string | null;
};

export const ORGANIZATIONS: readonly Organization[] = [
  {
    ror: "03fd77x13",
    name: "Institut national de physique nucléaire et de physique des particules",
    acronym: "CNRS - IN2P3",
  },
  {
    ror: "02cte4b68",
    name: "Institut national de chimie",
    acronym: "CNRS - INC",
  },
  {
    ror: "01q76b368",
    name: "Institut écologie et environnement",
    acronym: "CNRS - INEE",
  },
  { ror: "00z54nq84", name: "Institut de Physique", acronym: "CNRS - INP" },
  {
    ror: "04b0z7q78",
    name: "Institut des sciences humaines et sociales",
    acronym: "CNRS - INSHS",
  },
  {
    ror: "04kdfz702",
    name: "Institut national des sciences de l'Univers",
    acronym: "CNRS - INSU",
  },
  {
    ror: "00rydyx93",
    name: "Institut des sciences biologiques",
    acronym: "CNRS - ISB",
  },
  {
    ror: "02feahw73",
    name: "Centre National de la Recherche Scientifique",
    acronym: "CNRS",
  },
  { ror: "035xkbk20", name: "Aix-Marseille Université", acronym: "AMU" },
  {
    ror: "00gdq8383",
    name: "Alliance Université-Entreprise de Grenoble",
    acronym: "AUEG",
  },
  { ror: "043htjv09", name: "CY Cergy Paris Université", acronym: null },
  {
    ror: "00dxbgs74",
    name: "Centre de Mathématiques Appliquées - CMA",
    acronym: "CMA",
  },
  {
    ror: "0579t4s85",
    name: "Centre de Morphologie Mathématique - CMM",
    acronym: "CMM",
  },
  { ror: "0180r7w69", name: "Centre de Robotique", acronym: null },
  {
    ror: "02yv0b554",
    name: "Centre d'Economie Industrielle - CERNA",
    acronym: "CERNA",
  },
  { ror: "042949r55", name: "HESAM Université", acronym: null },
  {
    ror: "05yd19040",
    name: "Institut Supérieur d'Ingénierie et Gestion de l'Environnement - ISIGE",
    acronym: "ISIGE",
  },
  { ror: "043a7rc44", name: "Institut catholique de paris", acronym: null },
  {
    ror: "013pnfx92",
    name: "Institut des Hautes Études pour l'Innovation et l'Entreprenariat - IHEIE",
    acronym: "IHEIE",
  },
  { ror: "04mv1z119", name: "La Rochelle Université", acronym: null },
  { ror: "01mtcc283", name: "Le Mans Université", acronym: null },
  { ror: "03gnr7b55", name: "Nantes Université", acronym: null },
  { ror: "01k40cz91", name: "Normandie Université", acronym: null },
  { ror: "044t4x544", name: "Nîmes Université", acronym: null },
  { ror: "0268ecp52", name: "Paris-Est Sup", acronym: null },
  {
    ror: "044feat76",
    name: "Sorbonne Université Maison des Modélisations, Ingénieries et technologies",
    acronym: "SUMMIT",
  },
  {
    ror: "00b0abc98",
    name: "Sigmund Freud Privatuniversität - Standort Paris",
    acronym: null,
  },
  { ror: "02en5vm52", name: "Sorbonne Université", acronym: null },
  { ror: "005ypkf75", name: "University of Reunion Island", acronym: null },
  { ror: "03pbgwk21", name: "Université Bordeaux Montaigne", acronym: null },
  { ror: "03k1bsr36", name: "Université Bourgogne Europe", acronym: null },
  {
    ror: "02dn7x778",
    name: "Université Bourgogne Franche-Comté",
    acronym: null,
  },
  { ror: "025s1b152", name: "Université Catholique de Lille", acronym: null },
  { ror: "029brtt94", name: "Université Claude Bernard Lyon 1", acronym: null },
  { ror: "01a8ajp46", name: "Université Clermont Auvergne", acronym: null },
  { ror: "019tgvf94", name: "Université Côte d'Azur", acronym: null },
  {
    ror: "05dzbpx12",
    name: "Université Européenne des Senteurs & Saveur",
    acronym: null,
  },
  { ror: "02rx3b187", name: "Université Grenoble Alpes", acronym: null },
  { ror: "03x42jk29", name: "Université Gustave Eiffel", acronym: null },
  { ror: "04yznqr36", name: "Université Jean Monnet", acronym: null },
  { ror: "05b5c0584", name: "Université Jean Moulin Lyon III", acronym: null },
  { ror: "05v509s40", name: "Université Le Havre Normandie", acronym: null },
  { ror: "03rth4p18", name: "Université Lumière Lyon 2", acronym: null },
  {
    ror: "03pcc9z86",
    name: "Université Marie et Louis Pasteur",
    acronym: null,
  },
  { ror: "0406t3m57", name: "Université Nantes Angers Le Mans", acronym: null },
  { ror: "04qb2qm38", name: "Université Paris-Panthéon-Assas", acronym: null },
  {
    ror: "002t25c44",
    name: "Université Paris 1 Panthéon-Sorbonne",
    acronym: null,
  },
  { ror: "04wez5e68", name: "Université Paris 8", acronym: null },
  { ror: "05f82e368", name: "Université Paris Cité", acronym: null },
  { ror: "052bz7812", name: "Université Paris Dauphine-PSL", acronym: null },
  { ror: "03b4d6f26", name: "Université Paris Lumières", acronym: "UPL" },
  { ror: "013bkhk48", name: "Université Paris Nanterre", acronym: null },
  {
    ror: "013cjyk83",
    name: "Université Paris Sciences et Lettres",
    acronym: null,
  },
  { ror: "05ggc9x40", name: "Université Paris-Est Créteil", acronym: null },
  { ror: "03xjwb503", name: "Université Paris-Saclay", acronym: null },
  {
    ror: "02ezch769",
    name: "Université Polytechnique Hauts-de-France",
    acronym: null,
  },
  { ror: "015m7wh34", name: "Université Rennes", acronym: null },
  { ror: "01m84wm78", name: "Université Rennes 2", acronym: null },
  { ror: "04gqg1a07", name: "Université Savoie Mont Blanc", acronym: null },
  { ror: "03z6jp965", name: "Université Sorbonne Nouvelle", acronym: null },
  { ror: "0199hds37", name: "Université Sorbonne Paris Nord", acronym: null },
  {
    ror: "05rth8x13",
    name: "Agence de l'Environnement et de la Maîtrise de l'Energie",
    acronym: "ADEME",
  },
  {
    ror: "04qkhgw46",
    name: "Agence Nationale pour la Gestion des Déchets Radioactifs",
    acronym: "ANDRA",
  },
  {
    ror: "01ha22c77",
    name: "Autorité de sûreté nucléaire et de radioprotection",
    acronym: "ANSR",
  },
  {
    ror: "05hnb7x64",
    name: "Bureau de Recherches Géologiques et Minières",
    acronym: "BRGM",
  },
  {
    ror: "00jjx8s55",
    name: "Commissariat à l'Energie atomique et aux énergies Alternatives",
    acronym: "CEA",
  },
  {
    ror: "04h1h0y33",
    name: "Centre National d'Etudes Spatiales",
    acronym: "CNES",
  },
  {
    ror: "04ezk3x31",
    name: "Université Toulouse - Jean Jaurès",
    acronym: null,
  },
  { ror: "0443n9e75", name: "Université Toulouse Capitole", acronym: null },
  { ror: "01ahyrz84", name: "Université Toulouse", acronym: null },
  { ror: "00jzv1t04", name: "Université catholique de l'ouest", acronym: null },
  { ror: "01anhj553", name: "Université catholique de lyon", acronym: null },
  { ror: "04yrqp957", name: "Université d'Angers", acronym: null },
  { ror: "053x9s498", name: "Université d'Artois", acronym: null },
  {
    ror: "00mfpxb84",
    name: "Université d'Avignon et des Pays de Vaucluse",
    acronym: null,
  },
  { ror: "014zrew76", name: "Université d'Orléans", acronym: null },
  {
    ror: "00e96v939",
    name: "Université d'Évry Val - d'Essonne",
    acronym: null,
  },
  {
    ror: "0501fq006",
    name: "Université d'été de Boulogne - sur - Mer",
    acronym: null,
  },
  { ror: "057qpr032", name: "Université de Bordeaux", acronym: null },
  {
    ror: "01b8h3982",
    name: "Université de Bretagne Occidentale",
    acronym: null,
  },
  { ror: "04ed7fw48", name: "Université de Bretagne Sud", acronym: null },
  { ror: "051kpcy16", name: "Université de Caen Normandie", acronym: null },
  { ror: "050ra0n32", name: "Université de Corse Pascal Paoli", acronym: null },
  { ror: "04k8k6n84", name: "Université de Haute-Alsace", acronym: null },
  { ror: "02kzqn938", name: "Université de Lille", acronym: null },
  { ror: "02cp04407", name: "Université de Limoges", acronym: null },
  { ror: "04vfs2w97", name: "Université de Lorraine", acronym: null },
  { ror: "01rk35k63", name: "Université de Lyon", acronym: null },
  { ror: "051escj72", name: "Université de Montpellier", acronym: null },
  {
    ror: "00qhdy563",
    name: "Université de Montpellier Paul-Valéry",
    acronym: null,
  },
  {
    ror: "01frn9647",
    name: "Université de Pau et des Pays de l'Adour",
    acronym: null,
  },
  { ror: "03am2jy38", name: "Université de Perpignan", acronym: null },
  {
    ror: "01gyxrk03",
    name: "Université de Picardie Jules Verne",
    acronym: null,
  },
  { ror: "04xhy8q59", name: "Université de Poitiers", acronym: null },
  {
    ror: "03hypw319",
    name: "Université de Reims Champagne - Ardenne",
    acronym: null,
  },
  { ror: "03nhjew95", name: "Université de Rouen Normandie", acronym: null },
  { ror: "00pg6eq24", name: "Université de Strasbourg", acronym: null },
  {
    ror: "04y5kwa70",
    name: "Université de Technologie de Compiègne",
    acronym: null,
  },
  {
    ror: "01qhqcj41",
    name: "Université de Technologie de Troyes",
    acronym: null,
  },
  { ror: "02m9kbe37", name: "Université de Toulon", acronym: null },
  { ror: "02wwzvj46", name: "Université de Tours", acronym: null },
  {
    ror: "03mkjjy25",
    name: "Université de Versailles Saint - Quentin - en - Yvelines",
    acronym: null,
  },
  {
    ror: "049we9z90",
    name: "Université de technologie Tarbes Occitanie Pyrénées",
    acronym: "UTTOP",
  },
  {
    ror: "05bn3m307",
    name: "Université de technologie de belfort - montbéliard",
    acronym: null,
  },
  {
    ror: "02gdcg342",
    name: "Université du littoral côte d'opale",
    acronym: null,
  },
  {
    ror: "04y8cs423",
    name: "École Nationale Supérieure des Mines de Paris",
    acronym: null,
  },
  {
    ror: "05k0nvr25",
    name: "Centre d'études et d'expertise sur les risques, l'environnement, la mobilité et l'aménagement",
    acronym: "CEREMA",
  },
  {
    ror: "04wsqd844",
    name: "Direction Générale de l'Armement",
    acronym: "DGA",
  },
  { ror: "05a0dhs15", name: "Ecole Normale Supérieure - PSL", acronym: "ENS" },
  {
    ror: "04zmssz18",
    name: "École Normale Supérieure de Lyon",
    acronym: "ENS",
  },
  {
    ror: "03rxtdc22",
    name: "École Normale Supérieure de Rennes",
    acronym: "ENS",
  },
  {
    ror: "00hx6zz33",
    name: "École Normale Supérieure Paris-Saclay",
    acronym: "ENS",
  },
  { ror: "03wd9za21", name: "Agence Spatiale Européenne", acronym: "ESA" },
  { ror: "03gcbhc33", name: "IFP Energies Nouvelles", acronym: "IFPEN" },
  {
    ror: "044jxhp58",
    name: "Institut Français de Recherche pour l'Exploitation de la Mer",
    acronym: "IFREMER",
  },
  {
    ror: "034yrjf77",
    name: "Institut National de l'Environnement Industriel et des Risques",
    acronym: "INERIS",
  },
  {
    ror: "003vg9w96",
    name: "Institut National de Recherche pour l'Agriculture, l'Alimentation et l'Environnement",
    acronym: "INRAe",
  },
  {
    ror: "004gzqz66",
    name: "Institut de Physique du Globe de Paris",
    acronym: "IPGP",
  },
  {
    ror: "05q3vnk25",
    name: "Institut de Recherche pour le Développement",
    acronym: "IRD",
  },
  {
    ror: "03wkt5x30",
    name: "Muséum national d'Histoire naturelle",
    acronym: "MNHN",
  },
  { ror: "039fj2469", name: "Observatoire de la Cote d'Azur", acronym: "OCA" },
  {
    ror: "005y2ap84",
    name: "Office national d'études et de recherches aérospatiales",
    acronym: "ONERA",
  },
  { ror: "027ka1x80", name: "NASA", acronym: null },
  {
    ror: "011ed2d57",
    name: "Institut Polaire Français Paul Émile Victor",
    acronym: "IPEV",
  },
  { ror: "029nkcm90", name: "Observatoire de Paris", acronym: null },
  { ror: "03e8rf594", name: "IMT Mines Alès", acronym: null },
  {
    ror: "0175hh227",
    name: "Conservatoire National des Arts et Métiers",
    acronym: "CNAM",
  },
  {
    ror: "0309cs235",
    name: "École Nationale Supérieure de Techniques Avancées - Paris",
    acronym: "ENSTA",
  },
  { ror: "05jxfge78", name: "IGN", acronym: "IGN" },
  { ror: "0233st365", name: "METEO France", acronym: null },
  {
    ror: "01nre9703",
    name: "Service Hydrographique et Océanographique de la Marine",
    acronym: "SHOM",
  },
  { ror: "02ryfmr77", name: "Université des Antilles", acronym: null },
  {
    ror: "02s376052",
    name: "École polytechnique fédérale de Lausanne",
    acronym: "EPFL",
  },
  {
    ror: "02kvxyf05",
    name: "Institut national de recherche en sciences et technologies du numérique",
    acronym: "Inria",
  },
  {
    ror: "02cnsac56",
    name: "Institut national d'études démographiques",
    acronym: "INED",
  },
  {
    ror: "05kpkpg04",
    name: "Centre de coopération internationale en recherche agronomique pour le développement",
    acronym: "CIRAD",
  },
  {
    ror: "0471kz689",
    name: "Agence nationale de sécurité sanitaire de l'alimentation, de l'environnement et du travail",
    acronym: "Anses",
  },
  { ror: "0495fxg12", name: "Institut Pasteur", acronym: "Institut Pasteur" },
  { ror: "04t0gwh46", name: "Institut Curie", acronym: "Institut Curie" },
  {
    ror: "01dg85j68",
    name: "Institut national de recherche et de sécurité",
    acronym: "INRS",
  },
];

// A ROR identifier: nine chars, a leading 0 then a base32 body and a two-digit
// checksum (https://ror.readme.io/docs/identifier). Validated by format, not by
// membership in ORGANIZATIONS, so the list can grow without rejecting values
// already stored.
export const organizationRorSchema = z
  .string()
  .regex(/^0[0-9a-hj-km-np-tv-z]{6}[0-9]{2}$/, "invalid ROR identifier");

export type OrganizationRor = z.infer<typeof organizationRorSchema>;

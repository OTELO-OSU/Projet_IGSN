import { z } from "zod";

// Generated from a CSV export; do not edit by hand for bulk changes. Refresh
// with: pnpm --filter @projet-igsn/domain sync-institutions
export type Osu = {
  code: string;
  name: string;
  organizationRors: readonly string[];
};

export const OSUS: readonly Osu[] = [
  {
    code: "OMP",
    name: "Observatoire Midi-Pyrénées",
    organizationRors: [
      "02feahw73",
      "0233st365",
      "03am2jy38",
      "04h1h0y33",
      "01ahyrz84",
      "05q3vnk25",
    ],
  },
  {
    code: "OASU",
    name: "OASU",
    organizationRors: ["02feahw73", "057qpr032", "04mv1z119", "003vg9w96"],
  },
  {
    code: "OREME",
    name: "OREME",
    organizationRors: [
      "02feahw73",
      "051escj72",
      "02ryfmr77",
      "05q3vnk25",
      "003vg9w96",
    ],
  },
  {
    code: "OSUPS",
    name: "OSUPS",
    organizationRors: ["02feahw73", "05f82e368", "00jjx8s55", "03xjwb503"],
  },
  {
    code: "OBSPM",
    name: "Observatoire de Paris",
    organizationRors: [
      "02feahw73",
      "029nkcm90",
      "014zrew76",
      "02en5vm52",
      "05f82e368",
      "013cjyk83",
      "02kzqn938",
    ],
  },
  {
    code: "OSUG",
    name: "Observatoire des Sciences de l’Univers de Grenoble",
    organizationRors: [
      "02feahw73",
      "02rx3b187",
      "003vg9w96",
      "05q3vnk25",
      "04gqg1a07",
      "03x42jk29",
    ],
  },
  {
    code: "OCA",
    name: "Observatoire de la cote d'azur",
    organizationRors: ["02feahw73", "019tgvf94", "039fj2469", "05q3vnk25"],
  },
  {
    code: "OSUL",
    name: "OSUL",
    organizationRors: ["02feahw73", "029brtt94", "04zmssz18", "04yznqr36"],
  },
  {
    code: "PYTHEAS",
    name: "Institut PYTHEAS",
    organizationRors: [
      "02feahw73",
      "035xkbk20",
      "003vg9w96",
      "02m9kbe37",
      "05q3vnk25",
      "04h1h0y33",
    ],
  },
  { code: "ObAS", name: "ObAS", organizationRors: ["02feahw73", "00pg6eq24"] },
  { code: "IAP", name: "IAP", organizationRors: ["02feahw73", "02en5vm52"] },
  {
    code: "THETA",
    name: "THETA",
    organizationRors: ["02feahw73", "03pcc9z86", "03k1bsr36"],
  },
  {
    code: "OSUC",
    name: "OSUC",
    organizationRors: ["02feahw73", "014zrew76", "05hnb7x64", "04h1h0y33"],
  },
  {
    code: "OSUNA",
    name: "OSUNA",
    organizationRors: [
      "02feahw73",
      "03gnr7b55",
      "03x42jk29",
      "044jxhp58",
      "0175hh227",
      "01mtcc283",
      "04yrqp957",
    ],
  },
  {
    code: "EFLUVE",
    name: "EFLUVE",
    organizationRors: ["02feahw73", "05f82e368", "05ggc9x40"],
  },
  {
    code: "OVSQ",
    name: "OVSQ",
    organizationRors: ["02feahw73", "02en5vm52", "03mkjjy25", "00jjx8s55"],
  },
  {
    code: "OTELo",
    name: "Observatoire Terre et Environnement de Lorraine",
    organizationRors: ["02feahw73", "04vfs2w97"],
  },
  { code: "EOST", name: "EOST", organizationRors: ["02feahw73", "00pg6eq24"] },
  {
    code: "OPGC",
    name: "OPGC",
    organizationRors: ["02feahw73", "01a8ajp46", "04yznqr36", "05q3vnk25"],
  },
  {
    code: "OSU-Réunion",
    name: "OSU-Réunion",
    organizationRors: ["02feahw73", "0233st365", "044jxhp58", "05q3vnk25"],
  },
  {
    code: "Ecce Terra",
    name: "Ecce Terra",
    organizationRors: [
      "02feahw73",
      "051kpcy16",
      "03nhjew95",
      "043htjv09",
      "02en5vm52",
      "05q3vnk25",
      "03wkt5x30",
      "02ryfmr77",
      "003vg9w96",
    ],
  },
  {
    code: "STAMAR",
    name: "STAMAR",
    organizationRors: ["02feahw73", "02en5vm52"],
  },
  {
    code: "IUEM",
    name: "Institut Universitaire Européen de la Mer",
    organizationRors: ["02feahw73", "044jxhp58", "05q3vnk25"],
  },
  {
    code: "IPGP",
    name: "IPGP",
    organizationRors: ["02feahw73", "05f82e368", "004gzqz66"],
  },
  {
    code: "OSERen",
    name: "OSERen",
    organizationRors: [
      "02feahw73",
      "015m7wh34",
      "03gnr7b55",
      "03rxtdc22",
      "01m84wm78",
    ],
  },
  {
    code: "OSU-Externe",
    name: "Externe OSU",
    organizationRors: [
      "02feahw73",
      "02en5vm52",
      "05f82e368",
      "05ggc9x40",
      "00jjx8s55",
      "04h1h0y33",
      "03mkjjy25",
      "05q3vnk25",
      "03wkt5x30",
    ],
  },
];

// ponytail: format only, not membership in OSUS, so a stored code survives a refresh of this list; the cascade validator owns membership
export const osuCodeSchema = z.string().trim().min(1);

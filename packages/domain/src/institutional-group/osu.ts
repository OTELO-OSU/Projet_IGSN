import { z } from "zod";

// Generated from a CSV export, then refreshed from RNSR; do not edit by hand
// for bulk changes. Refresh with: pnpm --filter @projet-igsn/domain
// sync-institutions (CSV export) or sync-rnsr (RNSR)
export type Osu = {
  id: string;
  code: string;
  formerCodes?: readonly string[];
  name: string;
  organizationRors: readonly string[];
};

export const OSUS: readonly Osu[] = [
  {
    id: "200719584L",
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
    id: "200222184J",
    code: "OASU",
    name: "Observatoire aquitain des sciences de l'univers",
    organizationRors: ["02feahw73", "057qpr032", "04mv1z119", "003vg9w96"],
  },
  {
    id: "200919527R",
    code: "OREME",
    name: "Observatoire de recherche montpelliérain de l'environnement",
    organizationRors: [
      "02feahw73",
      "051escj72",
      "02ryfmr77",
      "05q3vnk25",
      "003vg9w96",
    ],
  },
  {
    id: "202324364M",
    code: "OSUPS",
    name: "Observatoire des sciences de l'univers de l'Université Paris-Saclay",
    organizationRors: ["02feahw73", "05f82e368", "00jjx8s55", "03xjwb503"],
  },
  {
    id: "200610854B",
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
    id: "200310841A",
    code: "OSUG",
    name: "Observatoire des sciences de l'univers de Grenoble",
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
    id: "200410855L",
    code: "OCA",
    name: "Observatoire de la Côte d'Azur",
    organizationRors: ["02feahw73", "019tgvf94", "039fj2469", "05q3vnk25"],
  },
  {
    id: "201521823K",
    code: "OSUL",
    name: "Observatoire des sciences de l'univers de Lyon",
    organizationRors: ["02feahw73", "029brtt94", "04zmssz18", "04yznqr36"],
  },
  {
    id: "201220900V",
    code: "PYTHEAS",
    name: "Institut Pythéas",
    organizationRors: [
      "02feahw73",
      "035xkbk20",
      "003vg9w96",
      "02m9kbe37",
      "05q3vnk25",
      "04h1h0y33",
    ],
  },
  {
    id: "199712602R",
    code: "ObAS",
    name: "Observatoire astronomique de Strasbourg",
    organizationRors: ["02feahw73", "00pg6eq24"],
  },
  {
    id: "200112483U",
    code: "IAP",
    name: "Institut d'astrophysique de Paris",
    organizationRors: ["02feahw73", "02en5vm52"],
  },
  {
    id: "201120530X",
    code: "THETA",
    name: "Terre-Homme-Environnement-Temps-Astronomie",
    organizationRors: ["02feahw73", "03pcc9z86", "03k1bsr36"],
  },
  {
    id: "200810873N",
    code: "OSUC",
    name: "Observatoire des sciences de l'univers en région Centre-Val de Loire",
    organizationRors: ["02feahw73", "014zrew76", "05hnb7x64", "04h1h0y33"],
  },
  {
    id: "201420664E",
    code: "OSUNA",
    name: "Observatoire des sciences de l'univers Nantes Atlantique",
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
    id: "201320583W",
    code: "EFLUVE",
    name: "Enveloppes fluides : de la ville à l'exobiologie",
    organizationRors: ["02feahw73", "05f82e368", "05ggc9x40"],
  },
  {
    id: "201020686W",
    code: "OVSQ",
    name: "Observatoire des sciences de l'univers de l'UVSQ",
    organizationRors: ["02feahw73", "02en5vm52", "03mkjjy25", "00jjx8s55"],
  },
  {
    id: "201320582V",
    code: "OTELo",
    name: "Observatoire Terre et Environnement de Lorraine",
    organizationRors: ["02feahw73", "04vfs2w97"],
  },
  {
    id: "199320515J",
    code: "EOST",
    name: "École et observatoire des sciences de la Terre de Strasbourg",
    organizationRors: ["02feahw73", "00pg6eq24"],
  },
  {
    id: "200810842E",
    code: "OPGC",
    name: "Observatoire de physique du globe de Clermont-Ferrand",
    organizationRors: ["02feahw73", "01a8ajp46", "04yznqr36", "05q3vnk25"],
  },
  {
    id: "201020888R",
    code: "OSU-Réunion",
    name: "Observatoire des sciences de l'univers de La Réunion",
    organizationRors: ["02feahw73", "0233st365", "044jxhp58", "05q3vnk25"],
  },
  {
    id: "201220920S",
    code: "Ecce Terra",
    name: "Observatoire des sciences de l'univers Paris-Centre Ecce Terra",
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
    id: "202023501M",
    code: "STAMAR",
    name: "Observatoire des sciences de l'univers Stations marines",
    organizationRors: ["02feahw73", "02en5vm52"],
  },
  {
    id: "200810872M",
    code: "IUEM",
    name: "Institut Universitaire Européen de la Mer",
    organizationRors: ["02feahw73", "044jxhp58", "05q3vnk25"],
  },
  {
    id: "201220893M",
    code: "IPGP",
    name: "Institut de physique du globe de Paris",
    organizationRors: ["02feahw73", "05f82e368", "004gzqz66"],
  },
  {
    id: "201220716V",
    code: "OSERen",
    name: "Observatoire des sciences de l'environnement de Rennes",
    organizationRors: [
      "02feahw73",
      "015m7wh34",
      "03gnr7b55",
      "03rxtdc22",
      "01m84wm78",
    ],
  },
  {
    id: "local:OSU-Externe",
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

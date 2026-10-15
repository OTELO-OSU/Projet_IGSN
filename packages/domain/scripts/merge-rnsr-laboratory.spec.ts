import { type Laboratory } from "../src/institutional-group/laboratory.ts";
import { mergeRnsrLaboratory } from "./merge-rnsr-laboratory.ts";

const curated: Laboratory = {
  id: "200212761S",
  code: "UMR8187",
  acronym: "LOG",
  name: "Laboratoire d'océanologie et de géosciences",
  osu: "OSU",
  organizationRors: ["02feahw73"],
};

describe("mergeRnsrLaboratory", () => {
  it.each([
    {
      case: "keep the curated laboratory when RNSR has no record",
      current: curated,
      libelle: undefined,
      expected: curated,
    },
    {
      case: "keep the curated name of a pinned laboratory",
      current: {
        ...curated,
        code: "UMR6502",
        name: "Institut des matériaux de Nantes Jean Rouxel",
      },
      libelle: "INSTITUT DES MATERIAUX DE NANTES",
      expected: {
        ...curated,
        code: "UMR6502",
        name: "Institut des matériaux de Nantes Jean Rouxel",
      },
    },
    {
      case: "keep the curated name of a laboratory pinned under a former code",
      current: { ...curated, code: "UAR6502", formerCodes: ["UMR6502"] },
      libelle: "INSTITUT DES MATERIAUX DE NANTES",
      expected: { ...curated, code: "UAR6502", formerCodes: ["UMR6502"] },
    },
    {
      case: "keep the curated name when RNSR differs only by case, accents and punctuation",
      current: {
        ...curated,
        name: "Laboratoire d'étude de l'Univers et des phénomènes eXtrèmes",
      },
      libelle: "Laboratoire d’Étude de l’Univers et des Phénomènes, Extrêmes",
      expected: {
        ...curated,
        name: "Laboratoire d'étude de l'Univers et des phénomènes eXtrèmes",
      },
    },
    {
      case: "take the RNSR name of a renamed laboratory",
      current: curated,
      libelle: "Laboratoire d'océanologie et de géosciences du littoral",
      expected: {
        ...curated,
        name: "Laboratoire d'océanologie et de géosciences du littoral",
      },
    },
    {
      case: "strip a leading code and acronym",
      current: { ...curated, name: "Old name" },
      libelle: "UMR 8187 - LOG - Laboratoire d'océanologie et de géosciences",
      expected: curated,
    },
    {
      case: "strip a leading acronym whatever its case",
      current: { ...curated, acronym: "LoG", name: "Old name" },
      libelle: "UMR 8187 - LOG - Laboratoire d'océanologie et de géosciences",
      expected: { ...curated, acronym: "LoG" },
    },
    {
      case: "strip a leading code alone",
      current: { ...curated, name: "Old name" },
      libelle: "UMR 8187 - Laboratoire d'océanologie et de géosciences",
      expected: curated,
    },
    {
      case: "strip a trailing dashed code",
      current: { ...curated, name: "Old name" },
      libelle: "Laboratoire d'océanologie et de géosciences - UMR6249",
      expected: curated,
    },
    {
      case: "strip a trailing code in parentheses",
      current: { ...curated, name: "Old name" },
      libelle: "Laboratoire d'océanologie et de géosciences (UMR 7550)",
      expected: curated,
    },
    {
      case: "strip a trailing bare code",
      current: { ...curated, name: "Old name" },
      libelle: "Laboratoire d'océanologie et de géosciences UMR 8212",
      expected: curated,
    },
  ])("should $case", ({ current, libelle, expected }) => {
    expect(
      mergeRnsrLaboratory(
        current,
        libelle === undefined ? undefined : { libelle },
      ),
    ).toEqual(expected);
  });
});

import { z } from "zod";

// Stratigraphic time scale (International Commission on Stratigraphy). A flat
// controlled vocabulary of stable ICS codes ordered youngest (ics1) to oldest
// (ics49); labels resolve through createSampleLabels (geologicalAgeLabel). The
// order is not asserted on, so a range (min/max) accepts any two codes.
export const GEOLOGICAL_AGES = [
  "ics1",
  "ics2",
  "ics3",
  "ics4",
  "ics5",
  "ics6",
  "ics7",
  "ics8",
  "ics9",
  "ics10",
  "ics11",
  "ics12",
  "ics13",
  "ics14",
  "ics15",
  "ics16",
  "ics17",
  "ics18",
  "ics19",
  "ics20",
  "ics21",
  "ics22",
  "ics23",
  "ics24",
  "ics25",
  "ics26",
  "ics27",
  "ics28",
  "ics29",
  "ics30",
  "ics31",
  "ics32",
  "ics33",
  "ics34",
  "ics35",
  "ics36",
  "ics37",
  "ics38",
  "ics39",
  "ics40",
  "ics41",
  "ics42",
  "ics43",
  "ics44",
  "ics45",
  "ics46",
  "ics47",
  "ics48",
  "ics49",
] as const;

export const geologicalAgeSchema = z.enum(GEOLOGICAL_AGES);

export type GeologicalAge = z.infer<typeof geologicalAgeSchema>;

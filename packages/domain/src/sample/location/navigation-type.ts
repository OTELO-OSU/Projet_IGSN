import { z } from "zod";

// Marine positioning method, from the SESAR navigation-type vocabulary. Stored
// verbatim (language-neutral acronyms with slashes/colons), so the code is its
// own label; deliberately not lower_snake_case like other vocabularies (ADR 0014).
export const NAVIGATION_TYPES = [
  "ACOUSTIC_RANGING/GPS",
  "DGPS",
  "DVL",
  "DVL:Renav",
  "DVL:Renav:Confirmed",
  "DVL/LBL",
  "DVL/LBL:Renav",
  "DVL/LBL:Renav:Confirmed",
  "DVL/LBL/INS",
  "DVL/USBL",
  "DVL/USBL:Renav",
  "GLONASS",
  "GPS",
  "GPS:Assumed",
  "GPS/WireOut",
  "LAYBACK",
  "LAYBACK/LBL",
  "LBL",
  "Locale",
  "LORAN",
  "NotApplicable",
  "NotProvided",
  "RTK GPS",
  "USBL",
] as const;

export const navigationTypeSchema = z.enum(NAVIGATION_TYPES);

export type NavigationType = z.infer<typeof navigationTypeSchema>;

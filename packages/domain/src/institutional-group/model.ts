import { z } from "zod";

import { organizationRorSchema } from "../sample/scientific-context/organization.ts";
import { laboratoryCodeSchema } from "./laboratory.ts";
import { osuCodeSchema } from "./osu.ts";

// ponytail: three flat fields spread into userSchema and sampleSchema, no nested object, so neither table needs json building; defaulted null so payloads predating the feature keep parsing
export const institutionalGroupsFields = {
  institutionalOrganization: organizationRorSchema.nullable().default(null),
  institutionalOsu: osuCodeSchema.nullable().default(null),
  institutionalLaboratory: laboratoryCodeSchema.nullable().default(null),
};

export const institutionalGroupsSchema = z.object(institutionalGroupsFields);

export type InstitutionalGroups = z.infer<typeof institutionalGroupsSchema>;

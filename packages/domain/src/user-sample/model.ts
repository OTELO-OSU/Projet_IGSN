import { z } from "zod";

export const userSampleRoleSchema = z.enum(["owner", "contributor"]);

export type UserSampleRole = z.infer<typeof userSampleRoleSchema>;

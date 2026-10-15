import { z } from "zod";

import { contactSampleOwnerBodySchema } from "../sample/sample-validator.ts";

export const contactAdminBodySchema = contactSampleOwnerBodySchema.extend({
  subject: z.string().trim().min(1).max(200),
});

export type ContactAdminBody = z.infer<typeof contactAdminBodySchema>;

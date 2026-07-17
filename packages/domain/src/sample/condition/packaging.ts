import { z } from "zod";

export const PACKAGINGS = [
  "glass_bottle",
  "plastic_bottle",
  "plastic_bag",
  "plastic_vial",
  "plastic_pail",
  "metal_handle_pail",
  "paper_bag",
  "canvas_bag",
  "cardboard_box",
] as const;

export const packagingSchema = z.enum(PACKAGINGS);

export type Packaging = z.infer<typeof packagingSchema>;

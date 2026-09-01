import { z } from "zod";

export const FINAL_PRODUCTS = ["rock", "fluid", "mineral", "glass"] as const;

export const finalProductSchema = z.enum(FINAL_PRODUCTS);

export type FinalProduct = z.infer<typeof finalProductSchema>;

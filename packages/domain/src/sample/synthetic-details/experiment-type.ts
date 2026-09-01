import { z } from "zod";

export const EXPERIMENT_TYPES = [
  "phase_diagram",
  "doping_standard",
  "solubility_partitioning",
  "diffusion",
  "crystallization_dynamic",
  "fusion",
  "fluid_rock_interaction",
  "deformation",
  "in_situ_measurement",
] as const;

export const experimentTypeSchema = z.enum(EXPERIMENT_TYPES);

export type ExperimentType = z.infer<typeof experimentTypeSchema>;

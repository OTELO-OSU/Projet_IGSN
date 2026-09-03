import { z } from "zod";

export const RELATION_TARGET_RESOURCE_TYPES = [
  "audiovisual",
  "award",
  "book",
  "book_chapter",
  "collection",
  "computational_notebook",
  "conference_paper",
  "conference_proceeding",
  "data_paper",
  "dataset",
  "dissertation",
  "event",
  "image",
  "instrument",
  "interactive_resource",
  "journal",
  "journal_article",
  "model",
  "output_management_plan",
  "peer_review",
  "physical_object",
  "poster",
  "preprint",
  "presentation",
  "project",
  "report",
  "service",
  "software",
  "sound",
  "standard",
  "study_registration",
  "text",
  "workflow",
  "other",
] as const;

export const relationTargetResourceTypeSchema = z.enum(
  RELATION_TARGET_RESOURCE_TYPES,
);

export type RelationTargetResourceType = z.infer<
  typeof relationTargetResourceTypeSchema
>;

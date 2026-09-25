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
  "field_notebook",
  "image",
  "instrument",
  "interactive_resource",
  "journal",
  "journal_article",
  "model",
  "peer_review",
  "poster",
  "preprint",
  "presentation",
  "project",
  "report",
  "sampling_management_plan",
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

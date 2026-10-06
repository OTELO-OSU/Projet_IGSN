import { z } from "zod";

import { m } from "#/paraglide/messages.js";

export const searchEngineSchema = z.enum(["text", "location"]);
export type SearchEngine = z.infer<typeof searchEngineSchema>;

export const ENGINES: SearchEngine[] = searchEngineSchema.options;

export function engineLabel(engine: SearchEngine): string {
  return engine === "location"
    ? m.search_engine_location()
    : m.search_engine_text();
}

export function addEngineLabel(engine: SearchEngine): string {
  return engine === "location"
    ? m.search_add_engine_location()
    : m.search_add_engine_text();
}

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@projet-igsn/design-system/components/ui/tabs";
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

// Its own copy, not "Add " + engineLabel(): the two read differently per engine.
export function addEngineLabel(engine: SearchEngine): string {
  return engine === "location"
    ? m.search_add_engine_location()
    : m.search_add_engine_text();
}

export function SearchEngineTabs({
  engine,
  onEngineChange,
}: {
  engine: SearchEngine;
  onEngineChange: (engine: SearchEngine) => void;
}) {
  return (
    <Tabs
      value={engine}
      onValueChange={(value) => onEngineChange(value as SearchEngine)}
    >
      <TabsList>
        <TabsTrigger value="text">{m.search_engine_text()}</TabsTrigger>
        <TabsTrigger value="location">{m.search_engine_location()}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

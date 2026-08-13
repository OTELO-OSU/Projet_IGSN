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
      <TabsList className="bg-sky-800 p-1 group-data-[orientation=horizontal]/tabs:h-14">
        {ENGINES.map((option) => (
          <TabsTrigger
            key={option}
            value={option}
            className="px-5 text-base text-white hover:text-white data-[state=active]:text-sky-900 dark:text-white dark:hover:text-white dark:data-[state=active]:text-sky-900"
          >
            {engineLabel(option)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

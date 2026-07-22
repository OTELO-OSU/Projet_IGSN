import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@projet-igsn/design-system/components/ui/tabs";

import { m } from "#/paraglide/messages.js";

export type SearchEngine = "text" | "location";

// Switches between the text and location search engines. Presentational: the
// route owns the URL state and reacts to onEngineChange.
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

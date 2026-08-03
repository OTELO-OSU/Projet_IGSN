import { m } from "#/paraglide/messages.js";

export function searchEmptyMessage({
  search,
  bbox,
}: {
  search?: string;
  bbox?: string;
}) {
  return bbox && !search
    ? m.search_location_empty_hint()
    : m.search_no_results();
}

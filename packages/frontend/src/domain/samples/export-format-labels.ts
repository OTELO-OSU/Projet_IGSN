import type { SearchExportFormat } from "@projet-igsn/domain/sample/search/search-export-validator";

import { m } from "#/paraglide/messages.js";

export const EXPORT_FORMAT_LABELS = {
  csv: m.download_format_csv,
  xlsx: m.download_format_xlsx,
} satisfies Record<SearchExportFormat, () => string>;

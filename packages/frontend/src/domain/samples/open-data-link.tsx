import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";

import { m } from "#/paraglide/messages.js";

export function OpenDataLink({ className }: { className?: string }) {
  const datasetUrl = import.meta.env.VITE_DATA_GOUV_DATASET_URL;
  if (!datasetUrl) {
    return null;
  }

  return (
    <ExternalLink href={datasetUrl} className={className}>
      {m.open_data_link()}{" "}
      <span className="sr-only">{m.opens_in_new_tab()}</span>
    </ExternalLink>
  );
}

import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";

import { m } from "#/paraglide/messages.js";

export function OpenDataLink() {
  const datasetUrl = import.meta.env.VITE_DATA_GOUV_DATASET_URL;
  if (!datasetUrl) {
    return null;
  }

  return (
    <ExternalLink href={datasetUrl}>
      {m.open_data_link()} {m.opens_in_new_tab()}
    </ExternalLink>
  );
}

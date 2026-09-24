import type { Messages } from "@projet-igsn/domain/sample/create-sample-labels";

import catalog from "@projet-igsn/domain/messages/en.json" with { type: "json" };
import { createSampleLabels } from "@projet-igsn/domain/sample/create-sample-labels";

const messages = Object.fromEntries(
  Object.entries(catalog).map(([key, value]) => [key, () => value]),
) as unknown as Messages;

export const labels = createSampleLabels(messages);

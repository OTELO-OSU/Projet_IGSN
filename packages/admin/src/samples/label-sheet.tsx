import { createPortal } from "react-dom";

import { m } from "#/paraglide/messages.js";
import { type LabelSizeCm, SampleLabel } from "#/samples/sample-label.tsx";

export type LabelledSample = { id: string; igsn: string; name: string };

export function LabelSheet({
  samples,
  sizeCm,
}: {
  samples: LabelledSample[];
  sizeCm: LabelSizeCm;
}) {
  return createPortal(
    <ul
      aria-label={m.action_print_labels()}
      className="sample-label hidden gap-4 text-black print:grid"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${sizeCm}cm)` }}
    >
      {samples.map(({ id, igsn, name }) => (
        <li key={id} className="break-inside-avoid">
          <SampleLabel
            igsn={igsn}
            name={name}
            sizeCm={sizeCm}
            className="flex"
          />
        </li>
      ))}
    </ul>,
    document.body,
  );
}

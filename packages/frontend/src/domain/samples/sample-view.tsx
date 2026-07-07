import type { Sample } from "@projet-igsn/domain/sample/sample";

import { natureLabel } from "#/domain/samples/nature-label.ts";
import { m } from "#/paraglide/messages.js";

type SampleViewProps = {
  name: Sample["name"];
  igsn: Sample["igsn"];
  nature: Sample["nature"];
};

export function SampleView({ name, igsn, nature }: SampleViewProps) {
  return (
    <div>
      <div className="bg-sky-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
          <p className="mt-2 text-lg text-sky-100">{igsn}</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        <nav aria-label={m.sample_section_sample()} className="w-40 shrink-0">
          <ul>
            <li>
              <a
                href="#sample"
                aria-current="page"
                className="border-l-2 border-sky-800 pl-3 font-medium text-sky-900"
              >
                {m.sample_section_sample()}
              </a>
            </li>
          </ul>
        </nav>

        <section
          id="sample"
          aria-labelledby="sample-heading"
          className="flex-1"
        >
          <h2
            id="sample-heading"
            className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
          >
            {m.sample_section_sample()}
          </h2>
          <dl className="mt-2 divide-y">
            <div className="flex gap-4 px-4 py-3">
              <dt className="text-muted-foreground w-40">
                {m.sample_field_nature()}
              </dt>
              <dd className="font-medium">{natureLabel(nature)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

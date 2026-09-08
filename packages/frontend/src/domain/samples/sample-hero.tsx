import type { ReactNode } from "react";

export function SampleHero({
  name,
  igsn,
  actions,
}: {
  name: string;
  igsn: string | null;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-primary text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-6 py-14">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
          <p className="mt-2 text-lg text-sky-100">{igsn}</p>
        </div>
        {actions}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";

import { SampleQrCode } from "#/domain/samples/sample-qr-code.tsx";

export function SampleHero({
  name,
  igsn,
  internalNumber,
  actions,
}: {
  name: string;
  igsn: string | null;
  internalNumber: number | null;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-primary text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-6 py-14">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 text-lg text-sky-100">
            <span>{igsn}</span>
            {internalNumber === null ? null : (
              <span>{formatInternalId(internalNumber)}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          {actions}
          {igsn == null ? null : <SampleQrCode igsn={igsn} />}
        </div>
      </div>
    </div>
  );
}

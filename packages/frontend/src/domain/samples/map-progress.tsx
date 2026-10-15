import { useId } from "react";

export const MAP_OVERLAY_CLASS =
  "bg-background absolute top-1/2 left-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 rounded-md px-3 py-2 text-sm shadow";

export function MapProgress({
  label,
  percent,
}: {
  label: string;
  percent?: number;
}) {
  const labelId = useId();
  return (
    <div
      role="status"
      className={`${MAP_OVERLAY_CLASS} flex flex-col items-center gap-2`}
    >
      <span id={labelId}>{label}</span>
      <progress
        aria-labelledby={labelId}
        value={percent}
        max={100}
        className="w-48"
      />
    </div>
  );
}

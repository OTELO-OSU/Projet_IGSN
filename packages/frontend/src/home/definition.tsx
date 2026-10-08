import { m } from "#/paraglide/messages.js";

const WAVE_PATH = `M0 12 q12.5 -10 25 0${" t25 0".repeat(23)}`;

export function Definition() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6">
      <img
        src={`${import.meta.env.BASE_URL}igsn-mark.svg`}
        alt=""
        className="size-16"
      />
      <p className="text-body max-w-3xl text-center text-xl leading-relaxed text-balance sm:text-[1.75rem]">
        <strong className="text-primary block">
          {m.home_definition_lead()}
        </strong>{" "}
        {m.home_definition_rest()}
      </p>
      <svg
        aria-hidden
        viewBox="0 0 600 24"
        preserveAspectRatio="none"
        className="mt-18 h-6 w-1/2 text-gray-300"
      >
        <path
          d={WAVE_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

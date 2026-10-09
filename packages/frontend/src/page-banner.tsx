export function PageBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-primary/5 relative isolate overflow-hidden">
      <img
        src={`${import.meta.env.BASE_URL}igsn-emblem.svg`}
        alt=""
        className="pointer-events-none absolute top-6 -right-24 -z-10 hidden h-96 w-auto opacity-15 md:block"
      />
      <div className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-primary text-4xl font-bold sm:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="text-muted-foreground mt-2 text-lg">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SampleHero({
  name,
  igsn,
}: {
  name: string;
  igsn: string | null;
}) {
  return (
    <div className="bg-sky-700 text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
        <p className="mt-2 text-lg text-sky-100">{igsn}</p>
      </div>
    </div>
  );
}

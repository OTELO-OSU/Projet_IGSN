export function Ribbon({ text }: { text: string }) {
  return (
    <span
      aria-hidden="true"
      className="text-primary absolute top-3 -left-7 w-28 -rotate-45 bg-amber-400 py-0.5 text-center text-xs font-bold shadow-sm"
    >
      {text}
    </span>
  );
}

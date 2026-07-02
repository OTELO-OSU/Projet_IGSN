import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <h1 className="text-foreground p-6 text-3xl font-bold">IGSN</h1>;
}

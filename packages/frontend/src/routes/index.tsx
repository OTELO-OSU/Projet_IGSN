import { Button } from "@projet-igsn/design-system/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [count, setCount] = useState(0);

  return (
    <Button onClick={() => setCount((c) => c + 1)}>count is: {count}</Button>
  );
}

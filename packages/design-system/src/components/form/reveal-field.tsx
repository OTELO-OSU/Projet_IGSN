import { type ReactNode, useState } from "react";

import { Button } from "../ui/button.tsx";

const focusFirstControl = (element: HTMLDivElement | null): void => {
  element
    ?.querySelector<HTMLElement>("input, textarea, select, button")
    ?.focus();
};

export function RevealField({
  label,
  isShown,
  canReveal,
  children,
}: {
  label: string;
  isShown: boolean;
  canReveal: boolean;
  children: ReactNode;
}): ReactNode {
  const [wasShown, setWasShown] = useState(isShown);
  const [isClicked, setIsClicked] = useState(false);
  if (isShown && !wasShown) setWasShown(true);
  if (wasShown || isClicked)
    return (
      <div className="contents" ref={isClicked ? focusFirstControl : undefined}>
        {children}
      </div>
    );
  if (!canReveal) return null;
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto justify-self-start p-0 text-sm underline"
      onClick={() => setIsClicked(true)}
    >
      {label}
    </Button>
  );
}

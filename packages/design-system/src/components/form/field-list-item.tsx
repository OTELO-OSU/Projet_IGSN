import type { ReactNode } from "react";

import { type LucideIcon, Trash2 } from "lucide-react";

import { cn } from "../../lib/utils.ts";
import { Button } from "../ui/button.tsx";

const FRAME = "relative grid gap-2 rounded-lg border p-4";

export function FieldListItem({
  legend,
  actions,
  children,
}: {
  legend?: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  const Frame = legend ? "fieldset" : "div";
  return (
    <Frame className={FRAME}>
      {legend && <legend className="px-1 text-sm font-medium">{legend}</legend>}
      <div className={cn("absolute right-2 flex", legend ? "top-0" : "top-2")}>
        {actions}
      </div>
      {children}
    </Frame>
  );
}

type FieldListActionProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function FieldListAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: FieldListActionProps & { icon: LucideIcon }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
    >
      <Icon aria-hidden />
    </Button>
  );
}

export function FieldListRemoveButton(props: FieldListActionProps) {
  return <FieldListAction icon={Trash2} {...props} />;
}

import { type LucideIcon, Trash2 } from "lucide-react";

import { Button } from "../ui/button.tsx";

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

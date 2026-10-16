import { SetStatusButton } from "#/samples/set-status-button.tsx";

export function SampleRestoreButton({
  text,
  menu,
  onSetStatus,
  disabled,
}: {
  text: "published" | "publish_now";
  menu?: "withdrawn";
  onSetStatus: (status: "published" | "withdrawn") => void;
  disabled: boolean;
}) {
  return (
    <SetStatusButton
      text={text}
      onConfirm={() => onSetStatus("published")}
      menu={
        menu && {
          text: menu,
          onConfirm: () => onSetStatus(menu),
        }
      }
      disabled={disabled}
    />
  );
}

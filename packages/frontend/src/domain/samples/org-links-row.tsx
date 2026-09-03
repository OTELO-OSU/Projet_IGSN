import { FieldRow } from "#/domain/samples/field-rows.tsx";
import { OrgLink } from "#/domain/samples/org-link.tsx";

export function OrgLinksRow({
  label,
  rors,
}: {
  label: string;
  rors: string[] | null | undefined;
}) {
  if (!rors?.length) return null;
  return (
    <FieldRow
      label={label}
      value={
        <ul className="flex flex-col gap-1">
          {rors.map((ror) => (
            <li key={ror}>
              <OrgLink ror={ror} />
            </li>
          ))}
        </ul>
      }
    />
  );
}

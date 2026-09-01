import { formatDate } from "@projet-igsn/domain/date/format-date";

export const dateRangeText = ({
  start,
  end,
}: {
  start: string;
  end: string;
}): string => {
  const from = formatDate(new Date(start));
  return start === end ? from : `${from} - ${formatDate(new Date(end))}`;
};

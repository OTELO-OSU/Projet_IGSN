import { dateFromToday } from "@projet-igsn/domain/date/date-from-today";
import { render } from "vitest-browser-react";

import { PublicationDateField } from "./publication-date-field.tsx";

describe("PublicationDateField", () => {
  it.each([
    ["today", dateFromToday(0, 0), "Pick a date after today."],
    [
      "a date beyond two years",
      dateFromToday(2, 1),
      "Pick a date at most two years from today.",
    ],
  ])("should refuse %s", async (_case, date, message) => {
    const screen = await render(
      <PublicationDateField value={date} onChange={() => {}} />,
    );

    await expect.element(screen.getByRole("alert")).toHaveTextContent(message);
  });
});

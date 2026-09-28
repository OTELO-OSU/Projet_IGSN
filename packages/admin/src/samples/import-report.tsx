import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@projet-igsn/design-system/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";
import { importIssueLabel } from "#/samples/import-issue-label.ts";

const issueKey = ({ row, column, code, message }: ImportIssue) =>
  `${row}|${column}|${code}|${message}`;

const MAX_VALUE_LENGTH = 140;

function IssueValue({ value = "" }: { value?: string }) {
  if (value.length <= MAX_VALUE_LENGTH) return value;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{`${value.slice(0, MAX_VALUE_LENGTH)}…`}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm wrap-anywhere">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}

export function ImportReport({ issues }: { issues: ImportIssue[] }) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-intro`}
      tabIndex={0}
      className="grid max-h-80 gap-4 overflow-auto text-sm"
    >
      <p id={`${id}-intro`} className="text-destructive">
        {m.import_report_intro()}
      </p>
      {[
        ...Map.groupBy(
          issues,
          (issue) => issue.sheet ?? m.import_report_file(),
        ),
      ].map(([sheet, sheetIssues], index) => (
        <div key={sheet} className="grid gap-2">
          <h3 id={`${id}-${index}`} className="font-semibold">
            {sheet}
          </h3>
          <Table aria-labelledby={`${id}-${index}`}>
            <TableHeader>
              <TableRow>
                <TableHead>{m.import_report_row()}</TableHead>
                <TableHead>{m.import_report_column()}</TableHead>
                <TableHead>{m.import_report_value()}</TableHead>
                <TableHead>{m.import_report_problem()}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheetIssues.map((issue) => (
                <TableRow key={issueKey(issue)}>
                  <TableCell>{issue.row}</TableCell>
                  <TableCell>{issue.column}</TableCell>
                  <TableCell className="wrap-anywhere whitespace-normal">
                    <IssueValue value={issue.value} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {importIssueLabel(issue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </section>
  );
}

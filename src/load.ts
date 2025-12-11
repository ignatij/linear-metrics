import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import fs from "fs";
import { calculateWorkingHours } from "./metrics";
import { LinearIssue } from "./types";

dayjs.extend(duration);

export const load = (csvPath: string): LinearIssue[] => {
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true, // allow lines with missing columns
    trim: true,
    quote: '"', // Linear wraps text fields in quotes
  });

  const tickets = records
    .map((r: any) => {
      const started = dayjs(r["Started"]);
      if (!started.isValid()) {
        return null;
      }
      let inProgress = false;
      let completed: dayjs.Dayjs;
      if (dayjs(r["Completed"]).isValid()) {
        completed = dayjs(r["Completed"]);
      } else {
        return null;
      }

      const hours = calculateWorkingHours(started, completed);
      return {
        id: r["ID"],
        title: r["Title"] || "(No title)",
        assignee: r["Assignee"] || "Unassigned",
        team: r["Team"] || "",
        state: r["State"] || "",
        created: r["Created"] || "",
        started: started.toISOString(),
        completed: completed.toISOString(),
        durationHours: hours,
        inProgress: inProgress,
      };
    })
    .filter(Boolean) as LinearIssue[];
  return tickets;
};

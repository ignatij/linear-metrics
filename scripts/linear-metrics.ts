import fs from "fs";
import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(duration);

const CSV_PATH = process.argv[2] || "linear-export.csv";

function calculateWorkingHours(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  const WORK_START_HOUR = 9;
  const WORK_END_HOUR = 17;
  const MS_PER_HOUR = 1000 * 60 * 60;

  if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
    return 0;
  }

  let totalWorkingMs = 0;
  let current = start;

  // Helper: is weekend?
  function isWeekend(date: dayjs.Dayjs) {
    const day = date.day(); // Sunday=0, Saturday=6
    return day === 0 || day === 6;
  }

  // Adjust start time if outside working hours
  if (current.hour() < WORK_START_HOUR) {
    current = current.hour(WORK_START_HOUR).minute(0).second(0);
  } else if (current.hour() >= WORK_END_HOUR) {
    current = current.add(1, "day").hour(WORK_START_HOUR).minute(0).second(0);
  }

  // Adjust end time if outside working hours
  if (end.hour() > WORK_END_HOUR) {
    end = end.hour(WORK_END_HOUR).minute(0).second(0);
  } else if (end.hour() < WORK_START_HOUR) {
    end = end.hour(WORK_START_HOUR).minute(0).second(0);
  }

  while (current.isBefore(end)) {
    if (!isWeekend(current)) {
      const workDayStart = current.hour(WORK_START_HOUR).minute(0).second(0);
      const workDayEnd = current.hour(WORK_END_HOUR).minute(0).second(0);

      const intervalStart = current.isAfter(workDayStart)
        ? current
        : workDayStart;
      const intervalEnd = end.isBefore(workDayEnd) ? end : workDayEnd;

      if (intervalEnd.isAfter(intervalStart)) {
        totalWorkingMs += intervalEnd.diff(intervalStart);
      }
    }

    current = current.add(1, "day").hour(WORK_START_HOUR).minute(0).second(0);
  }

  return totalWorkingMs / MS_PER_HOUR;
}

function formatWorkingHoursToDays(hours: number) {
  const HOURS_PER_DAY = 8;

  if (typeof hours !== "number" || hours < 0) {
    return "Invalid input";
  }

  const days = Math.floor(hours / HOURS_PER_DAY);
  const leftoverHours = hours % HOURS_PER_DAY;

  return `${days}d ${leftoverHours.toFixed(2)}h`;
}

function main() {
  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");

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
        // completed = dayjs();
        // inProgress = true;
      }

      const hours = calculateWorkingHours(started, completed);
      console.log(r["Title"], r["Started"], r["Completed"], hours);
      return {
        title: r["Title"] || "(No title)",
        assignee: r["Assignee"] || "Unassigned",
        team: r["Team"] || "",
        state: r["State"] || "",
        started: started.format("YYYY-MM-DD"),
        completed: completed.format("YYYY-MM-DD"),
        durationHours: hours,
        inProgress: inProgress,
      };
    })
    .filter(Boolean) as {
    title: string;
    assignee: string;
    team: string;
    state: string;
    started: string;
    completed: string;
    durationHours: number;
    inProgress: boolean;
  }[];

  if (tickets.length === 0) {
    console.log("No completed tickets found.");
    return;
  }

  // Calculate summary
  const total = tickets.reduce((a, b) => a + b.durationHours, 0);
  const avg = total / tickets.length;
  const sorted = [...tickets].sort((a, b) => a.durationHours - b.durationHours);
  const median = sorted[Math.floor(sorted.length / 2)].durationHours;

  // Print summary
  console.log("📊 Linear Metrics Summary");
  console.log("------------------------");
  console.log(`Tickets solved: ${tickets.length}h`);
  console.log(`Average resolution time: ${avg.toFixed(2)}h`);
  console.log(`Median resolution time: ${median.toFixed(2)}h`);
  console.log(
    `Shortest: ${sorted[0].durationHours.toFixed(2)}h | Longest: ${sorted.at(-1)!.durationHours.toFixed(2)}h\n`,
  );

  // Rank by duration (descending)
  console.log(` Longest Tickets ⏱️`);
  console.log("------------------------");
  const ranked = [...tickets].sort((a, b) => b.durationHours - a.durationHours);

  ranked.forEach((t, i) => {
    console.log(
      `${i + 1}. ${t.title} — (${formatWorkingHoursToDays(t.durationHours)}) (${t.assignee})`,
    );
  });

  const solvedByAuthor: Record<string, number> = {};
  ranked.forEach((t) => {
    if (solvedByAuthor[t.assignee]) {
      solvedByAuthor[t.assignee]++;
    } else {
      solvedByAuthor[t.assignee] = 1;
    }
  });
  const entries = Object.entries(solvedByAuthor);

  // Sort descending by count
  entries.sort((a, b) => b[1] - a[1]);

  // entries is now sorted by highest count first
  console.log(`\n Highest Contributors ⭐️`);
  console.log("------------------------");
  entries.forEach((e, i) => {
    console.log(`${i + 1}. ${e[0]} ${e[1]}`);
  });
}

main();

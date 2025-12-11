import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { LinearIssue, LinearIssueMetrics } from "./types";

dayjs.extend(duration);

const CSV_PATH = process.argv[2] || "linear-export.csv";

export function calculateWorkingHours(start: dayjs.Dayjs, end: dayjs.Dayjs) {
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

export function formatWorkingHoursToDays(hours: number) {
  const HOURS_PER_DAY = 8;

  if (typeof hours !== "number" || hours < 0) {
    return "Invalid input";
  }

  const days = Math.floor(hours / HOURS_PER_DAY);
  const leftoverHours = hours % HOURS_PER_DAY;

  return `${days}d ${leftoverHours.toFixed(2)}h`;
}

// Time from when work starts (started) to when it’s completed (completed).
export function calculateCycleTime(issue: LinearIssue): number {
  if (!issue.started || !issue.completed) return 0;
  const start = dayjs(issue.started);
  const end = dayjs(issue.completed);
  return calculateWorkingHours(start, end);
}

// Time from when the issue was created (or first entered your workflow) to when it was completed
export function calculateLeadTime(issue: LinearIssue): number {
  if (!issue.created || !issue.completed) return 0;
  const start = dayjs(issue.created);
  const end = dayjs(issue.completed);
  return calculateWorkingHours(start, end);
}

export function averageCycleTime(issues: LinearIssue[]): number {
  const times = issues.map(calculateCycleTime).filter((h) => h > 0);
  return times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
}

export function averageLeadTime(issues: LinearIssue[]): number {
  const times = issues.map(calculateLeadTime).filter((h) => h > 0);
  return times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
}

export function computeMetrics(issue: LinearIssue): LinearIssueMetrics {
  const created = dayjs(issue.created);
  const started = dayjs(issue.started);
  const completed = dayjs(issue.completed);

  const cycleTimeHours = calculateWorkingHours(started, completed);
  const leadTimeHours = calculateWorkingHours(created, completed);

  const month = completed.format("YYYY-MM");

  return {
    ...issue,
    durationHours: cycleTimeHours,
    cycleTimeHours,
    leadTimeHours,
    month,
  };
}

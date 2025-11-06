import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { load } from "./load";
import {
  averageCycleTime,
  averageLeadTime,
  formatWorkingHoursToDays,
} from "./metrics";

dayjs.extend(duration);

const CSV_PATH = process.argv[2] || "linear-export.csv";

function main() {
  const tickets = load(CSV_PATH);

  if (tickets.length === 0) {
    console.log("No completed tickets found.");
    return;
  }

  // Calculate summary
  const total = tickets.reduce((a, b) => a + b.durationHours, 0);
  const avg = total / tickets.length;
  const sorted = [...tickets].sort((a, b) => a.durationHours - b.durationHours);
  const median = sorted[Math.floor(sorted.length / 2)].durationHours;
  const leadTime = averageLeadTime(tickets);
  const cycleTime = averageCycleTime(tickets);

  // Print summary
  console.log("📊 Linear Metrics Summary");
  console.log("------------------------");
  console.log(`Tickets solved: ${tickets.length}`);
  console.log(`Average resolution time: ${avg.toFixed(2)}h`);
  console.log(`Median resolution time: ${median.toFixed(2)}h`);
  console.log(
    `Shortest: ${sorted[0].durationHours.toFixed(2)}h | Longest: ${sorted.at(-1)!.durationHours.toFixed(2)}h`,
  );
  console.log(`Average Lead Time: ${leadTime.toFixed(2)}h`);
  console.log(`Average Cycle Time: ${cycleTime.toFixed(2)}h`);

  // Rank by duration (descending)
  console.log(`\n Longest Tickets ⏱️`);
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

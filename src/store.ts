import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { LinearIssueMetrics } from "./types.js";

const DB_PATH = path.resolve("./db/metrics.db");

// We’ll initialize SQL.js and database in top-level await
const SQL = await initSqlJs({
  locateFile: (file: string) => `node_modules/sql.js/dist/${file}`,
});

let db: any;
if (fs.existsSync(DB_PATH)) {
  const fileBuffer = fs.readFileSync(DB_PATH);
  db = new SQL.Database(fileBuffer);
} else {
  db = new SQL.Database();
  db.run(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      title TEXT,
      assignee TEXT,
      team TEXT,
      state TEXT,
      created_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      duration_hours REAL,
      cycle_time_hours REAL,
      lead_time_hours REAL,
      month TEXT
    );
  `);
}

/**
 * Save array of issues into SQLite database
 */
export function saveIssues(issues: LinearIssueMetrics[]) {
  const stmt = db.prepare(`
     INSERT OR REPLACE INTO issues (
       id, title, assignee, team, state,
       created_at, started_at, completed_at,
       duration_hours, cycle_time_hours, lead_time_hours, month
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `);

  db.run("BEGIN TRANSACTION");
  for (const i of issues) {
    stmt.run([
      i.id ?? null,
      i.title ?? null,
      i.assignee ?? null,
      i.team ?? null,
      i.state ?? null,
      i.created ?? null,
      i.started ?? null,
      i.completed ?? null,
      i.durationHours ?? null,
      i.cycleTimeHours ?? null,
      i.leadTimeHours ?? null,
      i.month ?? null,
    ]);
  }
  db.run("COMMIT");
  stmt.free();

  persistDb();
}

/**
 * Retrieve aggregated stats by month and team
 */
export function getMonthlyStats() {
  const query = `
    SELECT
      month,
      team,
      COUNT(*) AS issues_done,
      ROUND(AVG(cycle_time_hours), 2) AS avg_cycle_time,
      ROUND(AVG(lead_time_hours), 2) AS avg_lead_time
    FROM issues
    WHERE completed_at IS NOT NULL
    GROUP BY month, team
    ORDER BY month DESC, team
  `;

  const res = db.exec(query);
  if (res.length === 0) return [];

  const [cols, rows] = [res[0].columns, res[0].values];
  return rows.map((r: any[]) =>
    Object.fromEntries(cols.map((c: string, i: number) => [c, r[i]])),
  );
}

export function getMonthlyPerformerStatus() {
  const query = `
    SELECT
      month,
      team,
      assignee,
      COUNT(*) AS issues_done,
      ROUND(AVG(cycle_time_hours), 2) AS avg_cycle_time,
      ROUND(AVG(lead_time_hours), 2) AS avg_lead_time
    FROM issues
    WHERE completed_at IS NOT NULL
    GROUP BY month, team, assignee
    ORDER BY month DESC, team, assignee
  `;

  const res = db.exec(query);
  if (res.length === 0) return [];

  const [cols, rows] = [res[0].columns, res[0].values];
  return rows.map((r: any[]) =>
    Object.fromEntries(cols.map((c: string, i: number) => [c, r[i]])),
  );
}

/**
 * Helper to persist the in-memory DB to disk
 */
function persistDb() {
  const data = db.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

import { load } from "./load";
import { computeMetrics } from "./metrics";
import { saveIssues } from "./store";

const CSV_PATH = process.argv[2] || "linear-export.csv";
const metrics = load(CSV_PATH);

saveIssues(metrics.map(computeMetrics));

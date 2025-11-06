import { getMonthlyPerformerStatus, getMonthlyStats } from "./store";

console.table(getMonthlyStats());
console.table(getMonthlyPerformerStatus());

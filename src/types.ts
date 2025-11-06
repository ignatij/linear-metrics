export interface LinearIssue {
  id: string
  title: string;
  assignee: string;
  team: string;
  state: string;
  created: string;
  started: string;
  completed: string;
  durationHours: number;
  inProgress: boolean;
}
export interface LinearIssueMetrics extends LinearIssue {
  durationHours: number;
  cycleTimeHours: number;
  leadTimeHours: number;
  month: string;
}

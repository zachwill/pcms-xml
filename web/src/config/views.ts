export type MainViewKey = "free-agents" | "salary-book" | "tankathon";
export type SidebarViewKey = "system-values" | "team-view";

export interface AppView<T extends string = string> {
  key: T;
  label: string;
  enabled: boolean;
}

// Placeholder registry. Only Salary Book is implemented today.
export const MAIN_VIEWS: AppView<MainViewKey>[] = [
  { key: "free-agents", label: "Free Agents", enabled: false },
  { key: "salary-book", label: "Salary Book", enabled: true },
  { key: "tankathon", label: "Tankathon", enabled: false },
];

export const SIDEBAR_VIEWS: AppView<SidebarViewKey>[] = [
  { key: "system-values", label: "System Values", enabled: false },
  { key: "team-view", label: "Team View", enabled: true },
];

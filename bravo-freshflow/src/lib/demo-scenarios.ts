export interface DemoScenario {
  id: string;
  label: string;
  emoji: string;
  description: string;
  route: string;
  roleId: string | null;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "crisis-yogurt",
    label: "Crisis: Qatıq 500q",
    emoji: "🥛",
    description:
      "Open Qatıq 500q with all panels pristine — AI Recommendation highlighted, combined scenario pre-selected.",
    route: "/products/p-demo-yogurt#whatif",
    roleId: "u-001",
  },
  {
    id: "morning-approvals",
    label: "Morning approvals queue",
    emoji: "☕",
    description:
      "Pending high-priority recommendations awaiting review for the start of the shift.",
    route: "/recommendations?tab=pending",
    roleId: "u-001",
  },
  {
    id: "employee-shift",
    label: "Employee shift starts",
    emoji: "👷",
    description:
      "Switch to an employee and land on their mobile task list with 3 queued tasks.",
    route: "/my-tasks",
    roleId: "u-010",
  },
  {
    id: "end-of-day",
    label: "End-of-day report",
    emoji: "🏁",
    description:
      "CEO view with elevated saved-value KPIs and the day's wins highlighted.",
    route: "/executive",
    roleId: "u-001",
  },
];

export function findScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}

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
    id: "risky-products",
    label: "Risky products triage",
    emoji: "📦",
    description:
      "Land on the risky products list with critical filter ready for triage.",
    route: "/products?risk=critical",
    roleId: "u-001",
  },
  {
    id: "tasks-followup",
    label: "Tasks follow-up",
    emoji: "✅",
    description:
      "Open the tasks queue to see approved AI actions in flight.",
    route: "/tasks",
    roleId: "u-001",
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

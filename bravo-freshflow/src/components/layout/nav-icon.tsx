import {
  LayoutDashboard,
  Activity,
  PackageSearch,
  Sparkles,
  FlaskConical,
  ListTodo,
  ClipboardCheck,
  Truck,
  Percent,
  BarChart3,
  Database,
  Bell,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Activity,
  PackageSearch,
  Sparkles,
  FlaskConical,
  ListTodo,
  ClipboardCheck,
  Truck,
  Percent,
  BarChart3,
  Database,
  Bell,
  ScrollText,
  Settings,
};

interface NavIconProps {
  name: string;
  className?: string;
}

export function NavIcon({ name, className }: NavIconProps) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";

interface PhasePlaceholderProps {
  phase: string;
  description?: string;
}

export function PhasePlaceholder({ phase, description }: PhasePlaceholderProps) {
  return (
    <Alert>
      <Sparkles className="h-4 w-4" />
      <AlertTitle>This page is built in {phase}</AlertTitle>
      <AlertDescription>
        {description ?? "Placeholder during bootstrap. Content arrives in the listed phase."}
      </AlertDescription>
    </Alert>
  );
}

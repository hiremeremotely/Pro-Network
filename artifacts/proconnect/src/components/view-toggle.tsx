import { LayoutGridIcon, ListIcon, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "grid" | "list" | "table";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
  options?: ViewMode[];
}

const ICONS: Record<ViewMode, React.ElementType> = {
  grid: LayoutGridIcon,
  list: ListIcon,
  table: TableIcon,
};

const LABELS: Record<ViewMode, string> = {
  grid: "Grid",
  list: "List",
  table: "Table",
};

export function ViewToggle({ view, onChange, options = ["grid", "list"] }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
      {options.map((opt) => {
        const Icon = ICONS[opt];
        const active = view === opt;
        return (
          <Button
            key={opt}
            variant="ghost"
            size="sm"
            onClick={() => onChange(opt)}
            title={LABELS[opt]}
            className={`h-7 w-7 p-0 rounded-md transition-all ${
              active
                ? "bg-white text-primary shadow-sm"
                : "text-gray-400 hover:text-gray-700 hover:bg-transparent"
            }`}
          >
            <Icon className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  delta?: number | null;
  suffix?: string;
  loading?: boolean;
}

export function MetricCard({ label, value, delta, suffix, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="terminal-card p-2" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="text-[10px] text-term-gray uppercase tracking-wider mb-1">{label}</div>
        <Skeleton className="h-5 w-20 bg-[#1A1A1A]" />
      </div>
    );
  }

  const displayValue = value == null || value === "" ? "—" : value;
  const deltaColor = delta != null ? (delta > 0 ? "text-gain" : delta < 0 ? "text-loss" : "text-term-gray") : "";
  const deltaSign = delta != null && delta > 0 ? "+" : "";

  return (
    <div className="terminal-card p-2" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="text-[10px] text-term-gray uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-white">
          {displayValue}{suffix || ""}
        </span>
        {delta != null && (
          <span className={`text-[10px] ${deltaColor}`}>
            {deltaSign}{delta.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

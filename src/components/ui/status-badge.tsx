import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "paused" | "error" | "healthy" | "degraded" | "offline";
  label?: string;
  className?: string;
}

const statusConfig = {
  active: {
    color: "bg-accent-green/10 text-accent-green border-accent-green/20",
    dot: "bg-accent-green",
    defaultLabel: "Active",
  },
  paused: {
    color: "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20",
    dot: "bg-accent-yellow",
    defaultLabel: "Paused",
  },
  error: {
    color: "bg-accent-red/10 text-accent-red border-accent-red/20",
    dot: "bg-accent-red",
    defaultLabel: "Error",
  },
  healthy: {
    color: "bg-accent-green/10 text-accent-green border-accent-green/20",
    dot: "bg-accent-green",
    defaultLabel: "Healthy",
  },
  degraded: {
    color: "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20",
    dot: "bg-accent-yellow",
    defaultLabel: "Degraded",
  },
  offline: {
    color: "bg-muted text-muted-foreground border-muted",
    dot: "bg-muted-foreground",
    defaultLabel: "Offline",
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.color,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {label || config.defaultLabel}
    </span>
  );
}

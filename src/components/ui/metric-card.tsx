import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  live?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  live,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "metric-card rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted-foreground/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            {live && (
              <span className="flex items-center gap-1 text-xs text-accent-green">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              changeType === "positive" && "text-accent-green",
              changeType === "negative" && "text-accent-red",
              changeType === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </span>
          <span className="text-xs text-muted-foreground">vs last hour</span>
        </div>
      )}
    </motion.div>
  );
}

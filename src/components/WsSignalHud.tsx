/**
 * WsSignalHud — compact 3-bar Wi-Fi–style signal indicator for WebSocket status.
 *
 * States:
 *   connected    → 3 solid green bars
 *   connecting   → 2 yellow bars, pulse animation
 *   reconnecting → 2 yellow bars, pulse animation
 *   error        → 1 solid red bar
 *   disconnected → 3 hollow gray bars (no fill)
 */

import { cn } from "@/lib/utils";

export type WsStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "error"
  | "disconnected";

interface WsSignalHudProps {
  status: WsStatus;
  className?: string;
}

const BAR_COUNT = 3;

// Height of each bar as a fraction of the container.
const BAR_HEIGHTS = ["40%", "65%", "100%"];

function barColor(status: WsStatus, barIndex: number): string {
  switch (status) {
    case "connected":
      return "bg-primary";
    case "connecting":
    case "reconnecting":
      // bars 0 and 1 lit, bar 2 empty
      return barIndex < 2 ? "bg-accent-yellow" : "bg-white/10";
    case "error":
      // only bar 0 lit
      return barIndex === 0 ? "bg-destructive" : "bg-white/10";
    case "disconnected":
    default:
      return "bg-white/20";
  }
}

const PULSE_STATUSES: WsStatus[] = ["connecting", "reconnecting"];

export function WsSignalHud({ status, className }: WsSignalHudProps) {
  const pulse = PULSE_STATUSES.includes(status);

  return (
    <span
      className={cn("inline-flex items-end gap-[2px] h-4", className)}
      title={status}
      aria-label={`WebSocket ${status}`}
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-sm transition-colors duration-300",
            barColor(status, i),
            pulse && "animate-pulse",
          )}
          style={{ height: BAR_HEIGHTS[i] }}
        />
      ))}
    </span>
  );
}

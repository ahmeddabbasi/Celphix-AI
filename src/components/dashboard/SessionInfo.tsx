/**
 * SessionInfo — live session duration since the most recent login + sessions today.
 * Data from /api/dashboard/session-info. Duration ticks every second client-side.
 */

import { Clock, LogIn, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionInfo } from "@/hooks/use-milestone-queries";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins === 0 ? `${hours}h` : `${hours}h ${remMins}m`;
}

function StatRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function SessionInfo() {
  const { data, isLoading } = useSessionInfo();

  // Seed elapsed seconds only once (on first successful data), then tick client-side.
  // We deliberately do NOT re-seed on subsequent refetches to avoid the visible
  // counter reset that would happen if the query refires every 60 s.
  const [elapsed, setElapsed] = useState<number>(0);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!seeded && data?.current_session_duration_seconds !== undefined) {
      setElapsed(data.current_session_duration_seconds);
      setSeeded(true);
    }
  }, [seeded, data?.current_session_duration_seconds]);

  useEffect(() => {
    if (!seeded) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [seeded]);

  const loginTime = data?.last_login_at ? parseISO(data.last_login_at) : null;
  const loginFormatted = loginTime ? format(loginTime, "MMM d 'at' HH:mm") : "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-4 w-4 text-primary" />
          Session Info
        </CardTitle>
        <CardDescription>Your current session details.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : (
          <>
            <StatRow
              icon={Clock}
              label="Session Duration"
              value={formatDuration(elapsed)}
              sub={`Last login ${loginFormatted}`}
            />
            <StatRow
              icon={LogIn}
              label="Sessions Today"
              value={
                data?.total_sessions_today !== undefined
                  ? `${data.total_sessions_today} ${data.total_sessions_today === 1 ? "session" : "sessions"}`
                  : "—"
              }
              sub="Login count for today"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}




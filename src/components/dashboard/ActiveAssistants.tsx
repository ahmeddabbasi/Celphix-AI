/**
 * ActiveAssistants — list of assistants currently on live calls.
 * Data from /api/dashboard/active-assistants (polled for near real-time).
 */

import { useMemo, useState } from "react";
import { Bot, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAssistants } from "@/hooks/use-milestone-queries";
import { CallSupervisionDialog, type SupervisionCall } from "@/components/dashboard/CallSupervisionDialog";

export function ActiveAssistants() {
  const [selectedCall, setSelectedCall] = useState<SupervisionCall | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useActiveAssistants();

  const activeCount = data?.active_count ?? 0;
  const activeNames = data?.active_names ?? [];
  const activeCalls = useMemo(() => data?.active_calls ?? [], [data?.active_calls]);

  const openCall = (call: SupervisionCall) => {
    setSelectedCall(call);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Phone className="h-4 w-4 text-primary" />
              Active Assistants
            </CardTitle>
            {!isLoading && (
              <Badge
                variant={activeCount > 0 ? "default" : "secondary"}
                className={activeCount > 0 ? "bg-primary text-primary-foreground" : ""}
              >
                {activeCount > 0 ? `${activeCount} live` : "None"}
              </Badge>
            )}
          </div>
          <CardDescription>Assistants currently on live calls.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 pb-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : activeCount > 0 ? (
            <div className="flex w-full items-center gap-2 overflow-x-auto pb-1">
              {(activeCalls.length > 0 ? activeCalls : activeNames.map((name, index) => ({
                call_id: index,
                assistant_id: null,
                assistant_name: name,
                session_id: null,
                call_started_at: null,
              }))).map((call) => (
                <button
                  key={`${call.session_id ?? call.call_id}`}
                  type="button"
                  onClick={() => openCall(call)}
                  className="inline-flex shrink-0 items-center gap-3 rounded-full border border-border/50 bg-muted/20 px-3 py-2 text-left transition-[transform,border-color,background-color] duration-200 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
                  title={call.assistant_name}
                >
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="max-w-[260px] truncate text-sm font-semibold leading-none text-foreground">
                      {call.assistant_name}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      Live
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Bot className="h-4 w-4 opacity-30" />
              <p className="text-xs">No assistants on calls right now.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CallSupervisionDialog open={dialogOpen} onOpenChange={setDialogOpen} call={selectedCall} />
    </>
  );
}

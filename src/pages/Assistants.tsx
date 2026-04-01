import { useNavigate } from "react-router-dom";
import { PhoneOff, RefreshCw } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { voices } from "@/data/voices";

// ─── Types ──────────────────────────────────────────────────────────────────

type AssistantStat = {
  assistant_id: number;
  display_name: string;
  agent_key: string | null;
  speaker_id: string | null;
  is_active: boolean;
  linked_sheet_name?: string | null;
  linked_number: string | null;
  linked_number_label: string | null;
  total_calls: number;
  session_calls: number;
  leads_booked: number;
  is_in_call: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function speakerName(speaker_id: string | null): string {
  if (!speaker_id) return "—";
  const v = voices.find((v) => v.speakerId === speaker_id);
  return v ? `${v.displayName} (${v.accent})` : speaker_id;
}

// ─── Assistant Card ─────────────────────────────────────────────────────────

function AssistantCard({ a }: { a: AssistantStat }) {
  const navigate = useNavigate();
  const voice = speakerName(a.speaker_id);
  const sheetName = a.linked_sheet_name ?? "—";
  const linkedNumber = a.linked_number ?? "—";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/assistants/${a.assistant_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/assistants/${a.assistant_id}`);
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl",
        "bg-card shadow-sm",
        "h-40 sm:h-44",
        "p-3 sm:p-3.5",
        "transition-all duration-200 ease-spring",
        a.is_active
          ? "border border-[#214226]/60 ring-1 ring-[#214226]/15 hover:border-[#214226] hover:ring-2 hover:ring-[#214226]/25"
          : "border border-[#ffea00]/60 ring-1 ring-[#ffea00]/15 hover:border-[#ffea00] hover:ring-2 hover:ring-[#ffea00]/25",
        "hover:shadow-md",
        "hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5",
          a.is_active ? "bg-[#214226]" : "bg-[#ffea00]",
        )}
      />

      <div className="flex h-full flex-col gap-2.5">
        <div className="min-h-[2.5rem]">
          <p className="text-[15px] font-semibold leading-tight tracking-[-0.01em] line-clamp-2">
          {a.display_name}
          </p>
        </div>

        <div className="mt-auto space-y-1.5">
          <div className="rounded-lg border border-border/30 bg-muted/20 px-2.5 py-1.5">
            <p className="text-[11px] text-muted-foreground truncate group-hover:text-foreground/90">
              {voice}
            </p>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/20 px-2.5 py-1.5">
            <p className="text-[11px] text-muted-foreground truncate group-hover:text-foreground/90">
              {linkedNumber}
            </p>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/20 px-2.5 py-1.5">
            <p className="text-[11px] text-muted-foreground truncate group-hover:text-foreground/90">
              {sheetName}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Assistants() {
  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 20_000,   // auto-refresh every 20 s to keep "live" status fresh
    refetchOnWindowFocus: true,
  });

  const assistants: AssistantStat[] = data?.assistants ?? [];
  const quota = data?.quota ?? 0;
  const isRefreshing = isFetching && !isPending;

  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div data-reveal className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-foreground">Assistants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quota > 0
              ? `${assistants.length} of ${quota} assistant${quota !== 1 ? "s" : ""} provisioned`
              : "No quota assigned — contact your admin"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isPending || isFetching}
          className="gap-2"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {isError && (
        <div data-reveal>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {(error as Error)?.message ?? "Failed to load assistants"}
          </div>
        </div>
      )}

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <section data-reveal className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Your Assistants</h2>
            {!isPending && (
              <span className="text-xs text-muted-foreground">{assistants.length} total</span>
            )}
          </div>

          {!isPending && assistants.some((a) => a.is_in_call) ? (
            <Badge className="bg-primary/15 text-primary border-primary/40 text-[11px] py-0 px-2">
              {assistants.filter((a) => a.is_in_call).length} live
            </Badge>
          ) : null}
        </div>

        {isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="rounded-2xl aspect-square" />
            ))}
          </div>
        ) : assistants.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 gap-2">
            {quota === 0 ? (
              <>
                <PhoneOff className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No assistants available</p>
                <p className="text-xs text-muted-foreground/60">No Quota assigned by the admin</p>
              </>
            ) : (
              <>
                <RefreshCw className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Provisioning assistants</p>
              </>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {assistants
              .slice()
              .sort((a, b) => {
                if (a.is_in_call !== b.is_in_call) return a.is_in_call ? -1 : 1;
                if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
                return a.display_name.localeCompare(b.display_name);
              })
              .map((a) => (
                <AssistantCard key={a.assistant_id} a={a} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

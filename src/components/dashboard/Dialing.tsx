import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PhoneCall, Users, Phone } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type AssistantWithStats = {
  assistant_id: number;
  display_name: string;
  linked_number: string | null;
  linked_number_label: string | null;
};

type AssistantsWithStatsApiRow = {
  assistant_id: number;
  display_name?: string | null;
  linked_number?: string | null;
  linked_number_label?: string | null;
};

type TwilioNumberRow = {
  id: number;
  phone_number: string;
  assistant_id: number | null;
  assistant_name: string | null;
  label: string | null;
};

function assistantLabel(a: AssistantWithStats, n?: TwilioNumberRow | null) {
  const name = a.display_name || (n?.assistant_name ?? `#${a.assistant_id}`);
  const phone = n?.phone_number ?? a.linked_number;
  return phone ? `${name} — ${phone}` : name;
}

export function Dialing() {
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [dialingAll, setDialingAll] = useState(false);
  const [dialingOne, setDialingOne] = useState(false);

  const selectedAssistantIdNum = Number(selectedAssistantId || 0);

  const assistantsQ = useQuery({
    queryKey: ["assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const numbersQ = useQuery({
    queryKey: ["twilio", "numbers"],
    queryFn: () => api.twilio.listNumbers(),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const dialerStatusQ = useQuery({
    queryKey: ["dialer", "status", selectedAssistantIdNum],
    queryFn: () => api.dialer.status(selectedAssistantIdNum),
    enabled: selectedAssistantIdNum > 0,
    staleTime: 2_000,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => (q.state.data?.running ? 5_000 : false),
  });

  const assistants: AssistantWithStats[] = useMemo(() => {
    const raw = (assistantsQ.data?.assistants ?? []) as AssistantsWithStatsApiRow[];
    return raw.map((a) => ({
      assistant_id: a.assistant_id,
      display_name: a.display_name ?? "",
      linked_number: a.linked_number ?? null,
      linked_number_label: a.linked_number_label ?? null,
    }));
  }, [assistantsQ.data]);

  const numbers: TwilioNumberRow[] = useMemo(() => {
    return (numbersQ.data?.numbers ?? []) as TwilioNumberRow[];
  }, [numbersQ.data]);

  const numberByAssistantId = useMemo(() => {
    const map = new Map<number, TwilioNumberRow>();
    for (const n of numbers) {
      if (n.assistant_id != null) map.set(n.assistant_id, n);
    }
    return map;
  }, [numbers]);

  const assistantsWithNumbers = useMemo(() => {
    return assistants
      .filter((a) => numberByAssistantId.has(a.assistant_id))
      .sort((a, b) => (a.display_name || `#${a.assistant_id}`).localeCompare(b.display_name || `#${b.assistant_id}`));
  }, [assistants, numberByAssistantId]);

  const startDialerForAssistant = useCallback(
    async (assistantId: number) => {
      const numberRow = numberByAssistantId.get(assistantId);
      if (!numberRow) {
        throw new Error("No Twilio number linked to this assistant.");
      }

      await api.dialer.start(assistantId);
      return { ok: true };
    },
    [numberByAssistantId],
  );

  const handleDialAll = useCallback(async () => {
    if (assistantsWithNumbers.length === 0) {
      toast.error("No assistants with linked numbers.");
      return;
    }

    setDialingAll(true);
    try {
      let ok = 0;
      let failed = 0;

      for (const a of assistantsWithNumbers) {
        try {
          await startDialerForAssistant(a.assistant_id);
          ok += 1;
        } catch {
          failed += 1;
        }
      }

      if (ok > 0) {
        toast.success(`Started dialing on ${ok} assistant${ok === 1 ? "" : "s"}.`);
      } else {
        toast.error("Unable to start dialing.");
      }
    } finally {
      setDialingAll(false);
    }
  }, [assistantsWithNumbers, startDialerForAssistant]);

  const handleDialSelected = useCallback(async () => {
    const assistantId = Number(selectedAssistantId);
    if (!assistantId) {
      toast.error("Select an assistant first.");
      return;
    }

    setDialingOne(true);
    try {
      const running = !!dialerStatusQ.data?.running;
      if (running) {
        await api.dialer.stop(assistantId);
        toast.success("Ending dialing after current call.");
      } else {
        await startDialerForAssistant(assistantId);
        toast.success("Started dialing.");
      }
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to start dialing."));
    } finally {
      setDialingOne(false);
    }
  }, [dialerStatusQ.data?.running, startDialerForAssistant, selectedAssistantId]);

  const isLoading = assistantsQ.isLoading || numbersQ.isLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <PhoneCall className="h-4 w-4 text-primary" />
          Dialing
        </CardTitle>
        <CardDescription>Start calling the next pending lead.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleDialAll}
                disabled={dialingAll || dialingOne || assistantsWithNumbers.length === 0}
                className="gap-2 btn--start-dialing"
              >
                <Users className="h-4 w-4" />
                {dialingAll ? "Starting…" : "Start Dialing for All"}
              </Button>

              <div className="flex items-center gap-2">
                <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select assistant…" />
                  </SelectTrigger>
                  <SelectContent>
                    {assistantsWithNumbers.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No assistants with linked numbers
                      </SelectItem>
                    ) : (
                      assistantsWithNumbers.map((a) => {
                        const n = numberByAssistantId.get(a.assistant_id) ?? null;
                        return (
                          <SelectItem key={a.assistant_id} value={String(a.assistant_id)}>
                            <span className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {assistantLabel(a, n)}
                            </span>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={handleDialSelected}
                  disabled={dialingAll || dialingOne || !selectedAssistantId}
                  className="shrink-0"
                >
                  {dialingOne
                    ? "Working…"
                    : dialerStatusQ.data?.running
                      ? "End Dialing"
                      : "Start Dialing"}
                </Button>
              </div>
            </div>

            {assistantsWithNumbers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Link a Twilio number to an assistant to enable dialing.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

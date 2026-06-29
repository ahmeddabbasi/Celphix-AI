import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PhoneCall, Users, Phone } from "lucide-react";
import { toast } from "sonner";

import { paygApi as api } from "@/lib/api";
import { headlessDialerApi } from "@/lib/api/dialer";
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

type ProviderNumberRow = {
  id: number;
  phone_number: string;
  assistant_id: number | null;
  assistant_name: string | null;
  label: string | null;
  provider: "twilio" | "vonage" | "telnyx" | "vicidial";
};

function assistantLabel(a: AssistantWithStats, n?: ProviderNumberRow | null) {
  const name = a.display_name || (n?.assistant_name ?? `#${a.assistant_id}`);
  const phone = n?.phone_number ?? a.linked_number;
  const providerSuffix = n?.provider ? ` (${n.provider.toUpperCase()})` : "";
  return phone ? `${name} — ${phone}${providerSuffix}` : name;
}

export function PaygDialing() {
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [dialingAll, setDialingAll] = useState(false);
  const [dialingOne, setDialingOne] = useState(false);

  const selectedAssistantIdNum = Number(selectedAssistantId || 0);

  const campaignId = useMemo(() => {
    const viciNum = numbers.find(n => n.provider === "vicidial");
    return viciNum?.campaign_id || "TEST";
  }, [numbers]);

  const assistantsQ = useQuery({
    queryKey: ["payg", "assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const twilioQ = useQuery({
    queryKey: ["payg", "twilio", "numbers"],
    queryFn: () => api.twilio.listNumbers().catch(() => ({ numbers: [] })),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const vonageQ = useQuery({
    queryKey: ["payg", "vonage", "numbers"],
    queryFn: () => api.vonage.listNumbers().catch(() => ({ numbers: [] })),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const telnyxQ = useQuery({
    queryKey: ["payg", "telnyx", "numbers"],
    queryFn: () => api.telnyx.listNumbers().catch(() => ({ numbers: [] })),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const vicidialQ = useQuery({
    queryKey: ["payg", "vicidial", "numbers"],
    queryFn: () => api.vicidial.listNumbers().catch(() => ({ numbers: [] })),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const dialerStatusQ = useQuery({
    queryKey: ["payg", "dialer", "status", selectedAssistantIdNum],
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

  const numbers: ProviderNumberRow[] = useMemo(() => {
    const twilioList = (twilioQ.data?.numbers ?? []).map(n => ({ ...n, provider: "twilio" as const }));
    const vonageList = (vonageQ.data?.numbers ?? []).map(n => ({ ...n, provider: "vonage" as const }));
    const telnyxList = (telnyxQ.data?.numbers ?? []).map(n => ({ ...n, provider: "telnyx" as const }));
    const vicidialList = (vicidialQ.data?.numbers ?? []).map(n => ({ ...n, provider: "vicidial" as const }));
    return [...twilioList, ...vonageList, ...telnyxList, ...vicidialList];
  }, [twilioQ.data, vonageQ.data, telnyxQ.data, vicidialQ.data]);

  const numberByAssistantId = useMemo(() => {
    const map = new Map<number, ProviderNumberRow>();
    for (const n of numbers) {
      if (n.assistant_id != null) map.set(n.assistant_id, n);
    }
    return map;
  }, [numbers]);

  const assistantsWithNumbers = useMemo(() => {
    return assistants
      .filter((a) => numberByAssistantId.has(a.assistant_id))
      .sort((a, b) =>
        (a.display_name || `#${a.assistant_id}`).localeCompare(b.display_name || `#${b.assistant_id}`),
      );
  }, [assistants, numberByAssistantId]);

  const startDialerForAssistant = useCallback(
    async (assistantId: number) => {
      const numberRow = numberByAssistantId.get(assistantId);
      if (!numberRow) {
        throw new Error("No number linked to this assistant.");
      }

      await api.dialer.start(assistantId);
      return { ok: true };
    },
    [numberByAssistantId],
  );

  const handleDialAll = useCallback(async () => {
    setDialingAll(true);
    try {
      const res = await headlessDialerApi.start(campaignId);
      if (res.success) {
        toast.success(res.message || `Successfully started dialing for campaign ${campaignId}.`);
      } else {
        toast.error(res.message || `Failed to start dialing for campaign ${campaignId}.`);
      }
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to start dialing."));
    } finally {
      setDialingAll(false);
    }
  }, [campaignId]);

  const handleStopAll = useCallback(async () => {
    setDialingAll(true);
    try {
      const res = await headlessDialerApi.stop(campaignId);
      if (res.success) {
        toast.success(res.message || `Successfully stopped dialing for campaign ${campaignId}.`);
      } else {
        toast.error(res.message || `Failed to stop dialing for campaign ${campaignId}.`);
      }
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to stop dialing."));
    } finally {
      setDialingAll(false);
    }
  }, [campaignId]);

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

  const isLoading =
    assistantsQ.isLoading ||
    twilioQ.isLoading ||
    vonageQ.isLoading ||
    telnyxQ.isLoading ||
    vicidialQ.isLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <PhoneCall className="h-4 w-4 text-primary" />
          Dialing
        </CardTitle>
        <CardDescription>Start an outbound sequence.</CardDescription>
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
                disabled={dialingAll || dialingOne}
                className="gap-2 btn--start-dialing-payg"
              >
                <Users className="h-4 w-4" />
                {dialingAll ? "Starting…" : "Start Dialing for All"}
              </Button>

              <Button
                onClick={handleStopAll}
                disabled={dialingAll || dialingOne}
                className="gap-2 btn--stop-dialing-payg"
              >
                <Users className="h-4 w-4" />
                {dialingAll ? "Stopping…" : "Stop Dialing for All"}
              </Button>

              <div className="flex items-center gap-2">
                <Select value={selectedAssistantId} onValueChange={setSelectedAssistantId}>
                  <SelectTrigger className="h-9 bg-primary text-primary-foreground border-primary hover:bg-primary/90">
                    <SelectValue placeholder="Select assistant…" />
                  </SelectTrigger>
                  <SelectContent className="bg-primary text-primary-foreground border-primary">
                    {assistantsWithNumbers.length === 0 ? (
                      <SelectItem value="__none__" disabled className="text-primary-foreground/50">
                        No assistants with linked numbers
                      </SelectItem>
                    ) : (
                      assistantsWithNumbers.map((a) => {
                        const n = numberByAssistantId.get(a.assistant_id) ?? null;
                        return (
                          <SelectItem 
                            key={a.assistant_id} 
                            value={String(a.assistant_id)}
                            className="focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground cursor-pointer font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 opacity-70" />
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
                  {dialingOne ? "Working…" : dialerStatusQ.data?.running ? "End Dialing" : "Start Dialing"}
                </Button>
              </div>
            </div>

            {assistantsWithNumbers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Link a number to an assistant to enable dialing.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

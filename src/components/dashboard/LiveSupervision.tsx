import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getWsUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useActiveSupervisionCalls } from "@/hooks/use-supervision-queries";

type TranscriptRole = "user" | "assistant";

type TranscriptEvent = {
  id: string;
  role: TranscriptRole;
  text: string;
  is_partial: boolean;
  ts_ms?: number;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pcm16ToFloat32(int16: Int16Array): Float32Array {
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i += 1) out[i] = int16[i] / 32768;
  return out;
}

function computeRmsAndPeak(samples: Float32Array): { rms: number; peak: number } {
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, samples.length));
  return { rms, peak };
}

export function LiveSupervision({ enabled }: { enabled: boolean }) {
  const callsQ = useActiveSupervisionCalls(enabled);
  const calls = useMemo(() => callsQ.data?.calls ?? [], [callsQ.data]);

  const [selectedCallId, setSelectedCallId] = useState<string>("");
  const [connectedCallId, setConnectedCallId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([]);
  const [audioRms, setAudioRms] = useState<number>(0);
  const [audioPeak, setAudioPeak] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const meterSmoothRef = useRef<{ rms: number; peak: number }>({ rms: 0, peak: 0 });

  useEffect(() => {
    if (!selectedCallId && calls.length > 0) setSelectedCallId(calls[0].call_id);
  }, [calls, selectedCallId]);

  const ensureAudioContext = useCallback((): AudioContext => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC({ sampleRate: 16000 });
    audioCtxRef.current = ctx;
    nextStartTimeRef.current = 0;
    return ctx;
  }, []);

  const closeWs = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      try {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      } catch {
        // ignore
      }
    }
    setConnectedCallId(null);
  }, []);

  const resetUi = useCallback(() => {
    setTranscripts([]);
    setAudioRms(0);
    setAudioPeak(0);
    meterSmoothRef.current = { rms: 0, peak: 0 };
  }, []);

  const disconnect = useCallback(() => {
    setStatus("Disconnected");
    closeWs();
  }, [closeWs]);

  const connect = useCallback(
    (callId: string) => {
      if (!callId) return;
      const token = getAuthToken();
      if (!token) {
        setStatus("Missing access token");
        return;
      }

      // Replace any existing connection.
      closeWs();
      resetUi();

      const wsUrl = getWsUrl();
      const url = `${wsUrl}/ws/listen/${encodeURIComponent(callId)}?access_token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      setStatus("Connecting…");

      ws.onopen = () => {
        setConnectedCallId(callId);
        setStatus("Connected");
      };

      ws.onclose = () => {
        setStatus("Disconnected");
        closeWs();
      };

      ws.onerror = () => {
        setStatus("Connection error");
      };

      ws.onmessage = async (evt: MessageEvent) => {
        // Text: transcript JSON. Binary: raw PCM16.
        if (typeof evt.data === "string") {
          try {
            const msg = JSON.parse(evt.data) as Record<string, unknown>;
            if (msg.type === "transcript") {
              const role = msg.role === "assistant" ? "assistant" : "user";
              const text = typeof msg.text === "string" ? msg.text : "";
              const isPartial = Boolean(msg.is_partial);
              const tsMs = typeof msg.ts_ms === "number" ? msg.ts_ms : undefined;

              setTranscripts((prev) => {
                const next = prev.slice();
                const id = `${role}:${tsMs ?? Date.now()}:${Math.random().toString(16).slice(2)}`;

                // Update last partial for same role when possible.
                if (isPartial) {
                  for (let i = next.length - 1; i >= 0; i -= 1) {
                    if (next[i].role === role && next[i].is_partial) {
                      next[i] = { ...next[i], text, ts_ms: tsMs };
                      return next;
                    }
                  }
                }

                // Final transcript: append and clear any stale partial for that role.
                for (let i = next.length - 1; i >= 0; i -= 1) {
                  if (next[i].role === role && next[i].is_partial) {
                    next.splice(i, 1);
                    break;
                  }
                }
                next.push({ id, role, text, is_partial: isPartial, ts_ms: tsMs });
                return next.slice(-200);
              });
            }
          } catch {
            // ignore
          }
          return;
        }

        if (!(evt.data instanceof ArrayBuffer)) return;

        // Some browsers deliver ArrayBuffer with a larger backing store; normalize.
        const ab = evt.data;
        if (ab.byteLength !== 640) {
          // Best-effort: ignore frames that don't match the expected 20ms size.
          return;
        }

        const ctx = ensureAudioContext();
        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
          } catch {
            // ignore
          }
        }

        const int16 = new Int16Array(ab);
        const samples = pcm16ToFloat32(int16);

        // Meter (simple smoothing so it doesn't flicker).
        const { rms, peak } = computeRmsAndPeak(samples);
        const prev = meterSmoothRef.current;
        const smoothed = {
          rms: prev.rms * 0.85 + rms * 0.15,
          peak: prev.peak * 0.75 + peak * 0.25,
        };
        meterSmoothRef.current = smoothed;
        setAudioRms(smoothed.rms);
        setAudioPeak(smoothed.peak);

        // Playback scheduling with small jitter buffer.
        const buffer = ctx.createBuffer(1, samples.length, 16000);
        buffer.copyToChannel(samples, 0);

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);

        const now = ctx.currentTime;
        const minLead = 0.05;
        let t = nextStartTimeRef.current;
        if (t < now + minLead) t = now + minLead;
        if (t - now > 1.0) t = now + minLead; // drop backlog if tab was paused

        try {
          src.start(t);
          nextStartTimeRef.current = t + buffer.duration;
        } catch {
          // ignore
        }
      };
    },
    [closeWs, ensureAudioContext, resetUi],
  );

  useEffect(() => {
    return () => {
      closeWs();
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx) {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }
    };
  }, [closeWs]);

  if (!enabled) return null;

  const connected = Boolean(connectedCallId);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Live Supervision</h2>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Listen to an active call and watch the live transcript.
          </p>
        </div>
        <div className="text-sm text-muted-foreground/80">{status}</div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Call list */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="label-caps text-muted-foreground/70">Active calls</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => callsQ.refetch()}
              disabled={callsQ.isFetching}
            >
              Refresh
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {calls.length === 0 ? (
              <div className="rounded-[14px] border border-border/60 p-4 text-sm text-muted-foreground/80">
                No active calls.
              </div>
            ) : (
              calls.map((c) => {
                const isSelected = selectedCallId === c.call_id;
                const isConnected = connectedCallId === c.call_id;
                return (
                  <button
                    key={c.call_id}
                    onClick={() => setSelectedCallId(c.call_id)}
                    className={cn(
                      "w-full rounded-[14px] border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {c.owner_username ?? "Unknown user"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                          Assistant {c.assistant_id ?? "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground/80">
                        {isConnected ? "Listening" : ""}
                      </div>
                    </div>
                    <p className="mt-2 truncate text-xs text-muted-foreground/70">
                      Started: {formatWhen(c.call_started_at ?? null)}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground/70">
                      Current listeners: {c.audio_listeners}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1"
              onClick={() => connect(selectedCallId)}
              disabled={!selectedCallId || (connected && connectedCallId === selectedCallId)}
            >
              Listen
            </Button>
            <Button className="flex-1" variant="outline" onClick={disconnect} disabled={!connected}>
              Disconnect
            </Button>
          </div>

          {/* Meter */}
          <div className="mt-4 rounded-[14px] border border-border/60 p-3">
            <p className="label-caps text-muted-foreground/70">Audio level</p>
            <div className="mt-2 space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                  <span>RMS</span>
                  <span>{Math.round(audioRms * 100)}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, Math.max(0, audioRms * 100))}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                  <span>Peak</span>
                  <span>{Math.round(audioPeak * 100)}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${Math.min(100, Math.max(0, audioPeak * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="lg:col-span-2">
          <p className="label-caps text-muted-foreground/70">Transcript</p>
          <div className="mt-3 rounded-[14px] border border-border/60">
            <ScrollArea className="h-[360px]">
              <div className="space-y-3 p-4">
                {transcripts.length === 0 ? (
                  <p className="text-sm text-muted-foreground/80">
                    {connected ? "Waiting for transcript…" : "Connect to a call to start."}
                  </p>
                ) : (
                  transcripts.map((t) => (
                    <div key={t.id} className="flex gap-3">
                      <div
                        className={cn(
                          "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                          t.role === "assistant" ? "bg-primary" : "bg-foreground/40",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground/70">
                          {t.role === "assistant" ? "Assistant" : "Customer"}
                          {t.is_partial ? " (live)" : ""}
                        </p>
                        <p className={cn("mt-1 text-sm text-foreground", t.is_partial && "opacity-80")}>
                          {t.text || "…"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </Card>
  );
}

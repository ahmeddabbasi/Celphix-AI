import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAuthToken } from "@/lib/auth";
import { getWsUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const PCM_SAMPLE_RATE = 16000;
const FRAME_SAMPLES = 320; // 20ms @16kHz
const CHUNK_SAMPLES = FRAME_SAMPLES; // keep playback at native 20ms cadence
const MAX_BUFFERED_SAMPLES = Math.floor(PCM_SAMPLE_RATE * 0.15); // ~150ms hard cap

export interface SupervisionCall {
  call_id: number;
  assistant_id: number | null;
  assistant_name: string;
  session_id: string | null;
  call_started_at: string | null;
}

type TranscriptRole = "user" | "assistant";

type TranscriptEvent = {
  id: string;
  role: TranscriptRole;
  text: string;
  is_partial: boolean;
  ts_ms?: number;
};

function pcm16ToFloat32(int16: Int16Array): Float32Array {
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i += 1) out[i] = int16[i] / 32768;
  return out;
}

function computeRmsAndPeak(samples: Float32Array): { rms: number; peak: number } {
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.abs(samples[i]);
    if (value > peak) peak = value;
    sumSq += value * value;
  }
  return { rms: Math.sqrt(sumSq / Math.max(1, samples.length)), peak };
}

function formatCallStart(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function CallSupervisionDialog({
  open,
  onOpenChange,
  call,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: SupervisionCall | null;
}) {
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([]);
  const [status, setStatus] = useState<string>("Idle");
  const [audioRms, setAudioRms] = useState(0);
  const [audioPeak, setAudioPeak] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackInRef = useRef<AudioNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const meterSmoothRef = useRef({ rms: 0, peak: 0 });
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const sampleBufRef = useRef<Float32Array>(new Float32Array(16000));
  const sampleLenRef = useRef(0);

  const callLabel = useMemo(() => {
    if (!call) return "No active call selected";
    return call.assistant_name || `Assistant ${call.assistant_id ?? "—"}`;
  }, [call]);

  const clearSampleBuffer = useCallback(() => {
    sampleLenRef.current = 0;
  }, []);

  const appendSamples = useCallback((samples: Float32Array) => {
    if (samples.length === 0) return;
    let buf = sampleBufRef.current;
    let len = sampleLenRef.current;

    const needed = len + samples.length;
    if (needed > buf.length) {
      const nextCap = Math.max(buf.length * 2, needed);
      const next = new Float32Array(nextCap);
      next.set(buf.subarray(0, len), 0);
      buf = next;
      sampleBufRef.current = buf;
    }

    buf.set(samples, len);
    len = needed;

    // Hard cap buffered audio to avoid lag accumulation if the tab stalls.
    if (len > MAX_BUFFERED_SAMPLES) {
      const drop = len - MAX_BUFFERED_SAMPLES;
      buf.copyWithin(0, drop, len);
      len = MAX_BUFFERED_SAMPLES;
    }

    sampleLenRef.current = len;
  }, []);

  const takeSamples = useCallback((n: number): Float32Array | null => {
    if (n <= 0) return new Float32Array(0);
    const buf = sampleBufRef.current;
    const len = sampleLenRef.current;
    if (len < n) return null;
    const out = buf.slice(0, n);
    buf.copyWithin(0, n, len);
    sampleLenRef.current = len - n;
    return out;
  }, []);

  const closeConnection = useCallback(() => {
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
  }, []);

  const flushScheduledAudio = useCallback(() => {
    const nodes = scheduledNodesRef.current;
    scheduledNodesRef.current = [];
    for (const node of nodes) {
      try {
        node.onended = null;
        node.stop();
      } catch {
        // ignore
      }
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    nextStartTimeRef.current = 0;
    clearSampleBuffer();
  }, [clearSampleBuffer]);

  const resetSession = useCallback(() => {
    setTranscripts([]);
    setAudioRms(0);
    setAudioPeak(0);
    meterSmoothRef.current = { rms: 0, peak: 0 };
    flushScheduledAudio();
    nextStartTimeRef.current = 0;
  }, [flushScheduledAudio]);

  const ensureAudioContext = useCallback((): AudioContext => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC({ sampleRate: PCM_SAMPLE_RATE });
    audioCtxRef.current = ctx;

    // Playback chain: HPF -> compressor -> makeup gain -> destination.
    // This improves intelligibility and perceived loudness without clipping.
    try {
      const hpf = ctx.createBiquadFilter();
      hpf.type = "highpass";
      hpf.frequency.value = 80;
      hpf.Q.value = 0.707;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;

      const gain = ctx.createGain();
      gain.gain.value = 1.25;

      hpf.connect(comp);
      comp.connect(gain);
      gain.connect(ctx.destination);
      playbackInRef.current = hpf;
    } catch {
      playbackInRef.current = ctx.destination;
    }

    return ctx;
  }, []);

  useEffect(() => {
    if (!open) return;
    const ctx = ensureAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {
        // ignore
      });
    }
  }, [ensureAudioContext, open]);

  useEffect(() => {
    if (!open || !call?.session_id) {
      closeConnection();
      return;
    }

    resetSession();

    const token = getAuthToken();
    if (!token) {
      setStatus("Missing access token");
      return;
    }

    const wsUrl = getWsUrl();
    const ws = new WebSocket(
      `${wsUrl}/ws/supervise/${encodeURIComponent(call.session_id)}?access_token=${encodeURIComponent(token)}`,
    );
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;
    setStatus("Connecting…");

    ws.onopen = () => setStatus("Connected");
    ws.onclose = (evt: CloseEvent) => {
      const reason = (evt.reason || "").trim();
      setStatus(reason ? `Disconnected (${evt.code}: ${reason})` : `Disconnected (${evt.code})`);
    };
    ws.onerror = () => setStatus("Connection error");
    ws.onmessage = async (evt: MessageEvent) => {
      if (typeof evt.data === "string") {
        try {
          const msg = JSON.parse(evt.data) as Record<string, unknown>;
          if (msg.type !== "transcript") return;
          const role: TranscriptRole = msg.role === "assistant" ? "assistant" : "user";
          const text = typeof msg.text === "string" ? msg.text : "";
          const isPartial = Boolean(msg.is_partial);
          const tsMs = typeof msg.ts_ms === "number" ? msg.ts_ms : undefined;

          setTranscripts((prev) => {
            const next = prev.slice();
            const id = `${role}:${tsMs ?? Date.now()}:${Math.random().toString(16).slice(2)}`;

            if (isPartial) {
              for (let i = next.length - 1; i >= 0; i -= 1) {
                if (next[i].role === role && next[i].is_partial) {
                  next[i] = { ...next[i], text, ts_ms: tsMs };
                  return next;
                }
              }
            }

            for (let i = next.length - 1; i >= 0; i -= 1) {
              if (next[i].role === role && next[i].is_partial) {
                next.splice(i, 1);
                break;
              }
            }

            next.push({ id, role, text, is_partial: isPartial, ts_ms: tsMs });
            return next.slice(-200);
          });
        } catch {
          // ignore
        }
        return;
      }

      if (!(evt.data instanceof ArrayBuffer)) return;
      if (evt.data.byteLength !== 640) return;

      const ctx = ensureAudioContext();
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }

      const samples = pcm16ToFloat32(new Int16Array(evt.data));
      const { rms, peak } = computeRmsAndPeak(samples);
      const prev = meterSmoothRef.current;
      const smoothed = {
        rms: prev.rms * 0.85 + rms * 0.15,
        peak: prev.peak * 0.75 + peak * 0.25,
      };
      meterSmoothRef.current = smoothed;
      setAudioRms(smoothed.rms);
      setAudioPeak(smoothed.peak);

      appendSamples(samples);

      const now = ctx.currentTime;
      const minLead = 0.05;
      const hardMaxLead = 0.15;
      let startTime = nextStartTimeRef.current;
      if (startTime < now + minLead) startTime = now + minLead;

      // If we got behind, snap to latest and discard stale scheduled audio.
      if (startTime - now > hardMaxLead) {
        flushScheduledAudio();
        startTime = now + minLead;
      }

      // Drain 20ms frames directly so playback tracks the broadcaster cadence.
      while (true) {
        const chunk = takeSamples(CHUNK_SAMPLES);
        if (!chunk) break;

        const buffer = ctx.createBuffer(1, chunk.length, PCM_SAMPLE_RATE);
        buffer.getChannelData(0).set(chunk);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(playbackInRef.current ?? ctx.destination);

        scheduledNodesRef.current.push(src);
        src.onended = () => {
          const arr = scheduledNodesRef.current;
          const idx = arr.indexOf(src);
          if (idx >= 0) arr.splice(idx, 1);
        };

        try {
          src.start(startTime);
          startTime += buffer.duration;
          nextStartTimeRef.current = startTime;
        } catch {
          // ignore
          break;
        }

        // Avoid building a large lead even during short bursts.
        if (startTime - now > hardMaxLead) break;
      }
    };

    return () => {
      closeConnection();
    };
  }, [call?.session_id, closeConnection, ensureAudioContext, flushScheduledAudio, open, resetSession]);

  useEffect(() => {
    return () => {
      closeConnection();
      flushScheduledAudio();
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      playbackInRef.current = null;
      if (ctx) {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }
    };
  }, [closeConnection, flushScheduledAudio]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 sm:max-w-5xl">
        <div className="flex max-h-[90vh] min-h-[70vh] flex-col p-[clamp(20px,3vw,32px)]">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-3">
              <span>{callLabel}</span>
              <Badge variant="secondary" className="shrink-0">
                Live supervision
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Session {call?.session_id ?? "—"} · Started {formatCallStart(call?.call_started_at)} · {status}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="rounded-[16px] border border-border/60 p-4">
                <p className="label-caps text-muted-foreground/70">Audio level</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                      <span>RMS</span>
                      <span>{Math.round(audioRms * 100)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, audioRms * 100))}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                      <span>Peak</span>
                      <span>{Math.round(audioPeak * 100)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, Math.max(0, audioPeak * 100))}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <Button className="mt-3 w-full" variant="outline" onClick={() => onOpenChange(false)}>
                Close supervision
              </Button>
            </div>

            <div className="min-h-0 lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className="label-caps text-muted-foreground/70">Conversation</p>
                <Button variant="ghost" size="sm" onClick={resetSession}>
                  Clear view
                </Button>
              </div>
              <div className="mt-3 h-[calc(100%-2rem)] rounded-[16px] border border-border/60">
                <ScrollArea className="h-full max-h-[calc(90vh-14rem)]">
                  <div className="space-y-3 p-4">
                    {transcripts.length === 0 ? (
                      <p className="text-sm text-muted-foreground/80">
                        {status === "Connected" ? "Waiting for conversation…" : "Connect to a live call to watch the conversation here."}
                      </p>
                    ) : (
                      transcripts.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div
                            className={cn(
                              "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                              item.role === "assistant" ? "bg-primary" : "bg-foreground/40",
                            )}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground/70">
                              {item.role === "assistant" ? "Assistant" : "Customer"}
                              {item.is_partial ? " (live)" : ""}
                            </p>
                            <p className={cn("mt-1 text-sm text-foreground", item.is_partial && "opacity-80")}>{item.text || "…"}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

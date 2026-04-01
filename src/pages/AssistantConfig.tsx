import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ChevronDown, Loader2, Save, Volume2, Pencil, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePublicVoices, type VoiceEntry } from "@/hooks/use-voice-queries";
import { api, getWsUrl, paygApi } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { callSession } from "@/lib/callSession";
import { WsSignalHud } from "@/components/WsSignalHud";
import { useQueryClient } from "@tanstack/react-query";

type AgentDetail = {
  id: string;
  display_name?: string;
  script_text?: string;
  speaker_id?: string | null;
  intro_message?: string | null;
  linked_dialing_file_id?: number | null;
};

type WsEvent = {
  ts: string;
  type: string;
  payload: any;
};

type DebugEventPayload = {
  type: "debug_event";
  session_id?: string;
  turn_id: string;
  stage: string;
  ts_iso?: string;
  t_ms?: number;
  latencies_ms?: Record<string, number>;
  meta?: any;
  extra?: any;
};

type ChatTurn = {
  id: string;
  ts: string;
  speaker: "user" | "agent";
  text: string;
};

type BgNoiseManifest = {
  version?: number;
  sounds: Array<{ id: string; label: string; file: string }>;
};

function nowIso() {
  return new Date().toISOString();
}

export default function AssistantConfig() {
  const { id } = useParams();
  const agentId = id ?? "";

  const location = useLocation();
  const isPayg = location.pathname.startsWith("/payg/");
  const surfaceApi = isPayg ? paygApi : api;
  const assistantsPath = isPayg ? "/payg/assistants" : "/assistants";
  const assistantsWithStatsQueryKey = isPayg ? ["payg", "assistants", "with-stats"] : ["assistants", "with-stats"];

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bgNoiseAssistantHydratedRef = useRef(false);
  const bgNoiseAssistantSaveTimerRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [callStarting, setCallStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [savingVoice, setSavingVoice] = useState(false);
  const [warmingUpVoice, setWarmingUpVoice] = useState(false);
  const [introMessage, setIntroMessage] = useState("");
  const [savingIntro, setSavingIntro] = useState(false);

  // Dialing Data linkage (1 assistant <-> 1 file)
  const [dialingFiles, setDialingFiles] = useState<Array<{ id: number; original_filename: string; row_count: number }>>([]);
  const [dialingFilesLoading, setDialingFilesLoading] = useState(false);
  const [linkedDialingFileId, setLinkedDialingFileId] = useState<number | null>(null);
  const [savingDialingLink, setSavingDialingLink] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<{
    index?: number | string;
    name?: string;
    number?: string;
  } | null>(null);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startNameEdit() {
    setDraftName(agent?.display_name ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function cancelNameEdit() {
    setEditingName(false);
    setDraftName("");
  }

  async function commitNameEdit() {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === agent?.display_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await surfaceApi.dashboard.renameAssistant(agentId, trimmed);
      setAgent((prev) => prev ? { ...prev, display_name: trimmed } : prev);
      setEditingName(false);
      queryClient.invalidateQueries({ queryKey: assistantsWithStatsQueryKey });
      toast({ title: "Renamed", description: `Assistant renamed to "${trimmed}"` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Rename failed", description: e?.message ?? "Failed to rename" });
    } finally {
      setSavingName(false);
    }
  }

  // (Active tab & showDebug were part of an earlier UI iteration; not used in current layout.)

  // Debug mode toggle (pipeline debug_event frames)
  const [debugMode, setDebugMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("assistant_debug_mode") === "true";
    } catch {
      return false;
    }
  });

  // Debug log is intentionally disabled (too noisy in production/operator mode).
  // Keep the state so the UI can render an empty log and the "Clear" button works.
  const [events, setEvents] = useState<WsEvent[]>([]);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  // Live partial transcript that updates while the user is speaking.
  // This is transient UI state and is cleared once a final transcript arrives.
  const [partialUserText, setPartialUserText] = useState<string>("");
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "connected" | "error" | "reconnecting">(
    "disconnected"
  );

  const [micStatus, setMicStatus] = useState<"idle" | "starting" | "streaming" | "stopped" | "error">(
    "idle"
  );

  const [speakerStatus, setSpeakerStatus] = useState<
    "idle" | "primed" | "playing" | "stopped" | "error"
  >("idle");

  const [sttStatus, setSttStatus] = useState<
    { status: "unknown" | "connected" | "failed"; message?: string } | null
  >(null);

  // Call flow status for modal
  const [callFlowStatus, setCallFlowStatus] = useState<
    "idle" | "warming" | "ready" | "ending" | "cleanup"
  >("idle");

  // Keep calling independent of routing: rehydrate from the singleton session.
  // Start/Stop controls still only live on this page.
  useEffect(() => {
    const syncFromGlobal = () => {
      const snap = callSession.snapshot();
      setWsStatus(snap.wsStatus as any);
      setMicStatus(snap.micStatus as any);
      setSpeakerStatus(snap.speakerStatus as any);
      setCallFlowStatus(snap.callFlowStatus as any);
      setCurrentCustomer(snap.currentCustomer as any);
      setPartialUserText(snap.partialUserText as any);
      // Mirror global state so navigation doesn't wipe the UI.
      setEvents((snap.events as any) ?? []);
      setChat(
        ((snap.chat as any) ?? []).map((t: any) => ({
          id: String(t.id),
          ts: new Date(typeof t.ts === "number" ? t.ts : Date.now()).toISOString(),
          speaker: t.speaker === "agent" ? "agent" : "user",
          text: String(t.text ?? ""),
        }))
      );
    };

    const unsub = callSession.subscribe(syncFromGlobal);
    syncFromGlobal();

    // Only AssistantConfig is allowed to control the mic.
    callSession.setMicFns(
      async () => {
        setMicStatus("starting");
        await startMicStreaming();
      },
      async () => {
        await stopMicStreaming();
        setMicStatus("idle");
      }
    );

    return () => {
      // IMPORTANT: do not stop calling when leaving the page.
      // Only detach mic handlers so other pages can't control start/stop.
      callSession.setMicFns(null, null);
      // Also do NOT stop playback on navigation; TTS should keep going.
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  // Monotonic counter to invalidate old WS handlers instantly.
  // Any late WS messages from a stopped call must be ignored so they can't
  // recreate playback contexts or restart background noise.
  const callEpochRef = useRef(0);
  
  // Interruption state
  const lastInterruptTimeRef = useRef<number>(0);
  const isAiSpeakingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  // Ref mirror of micStatus so closures (ws.onopen, etc.) always read current value.
  const micStatusRef = useRef<string>("idle");

  // Playback state (TTS from backend)
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackChainRef = useRef<{ nextTime: number } | null>(null);
  const playbackNodesRef = useRef<AudioBufferSourceNode[]>([]);

  // Background noise (playback-only; NEVER touches STT input)
  const [bgNoiseEnabled, setBgNoiseEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("assistant_bg_noise_enabled") === "true";
    } catch {
      return false;
    }
  });
  // User-facing 0..100 scale. Default volume = 10.
  const [bgNoiseVolume, setBgNoiseVolume] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("assistant_bg_noise_volume") ?? "10");
      return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 10;
    } catch {
      return 10;
    }
  });

  // Selected background sound URL (served from /public).
  const [bgNoiseUrl, setBgNoiseUrl] = useState<string>(() => {
    try {
      return localStorage.getItem("assistant_bg_noise_url") ?? "";
    } catch {
      return "";
    }
  });

  const [bgNoiseOptions, setBgNoiseOptions] = useState<Array<{ id: string; label: string; url: string }>>([]);
  const [bgNoiseManifestError, setBgNoiseManifestError] = useState<string | null>(null);

  // Note: background-noise settings are stored per-assistant in Postgres.

  // Preview audio (UI-level preview, not part of the call playback chain)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Once a call is active, noise settings must be frozen.
  const [bgNoiseLocked, setBgNoiseLocked] = useState(false);
  const bgNoiseLockedConfigRef = useRef<{ enabled: boolean; volume: number; url: string } | null>(null);

  const bgNoiseGainRef = useRef<GainNode | null>(null);
  const bgNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgNoiseBufferRef = useRef<AudioBuffer | null>(null);
  const bgNoiseBufferKeyRef = useRef<string | null>(null);

  // ── Voice data (public/visible voices from API) ──────────────────────
  const { data: voices } = usePublicVoices();

  const isDirty = useMemo(() => {
    if (!agent) return false;
    return (scriptText ?? "") !== (agent.script_text ?? "");
  }, [agent, scriptText]);

  const isVoiceDirty = useMemo(() => {
    if (!agent) return false;
    return (selectedVoice ?? null) !== (agent.speaker_id ?? null);
  }, [agent, selectedVoice]);

  const isIntroDirty = useMemo(() => {
    if (!agent) return false;
    return (introMessage ?? "") !== (agent.intro_message ?? "");
  }, [agent, introMessage]);

  // Debug events can be extremely chatty. On this page we expose an operator toggle
  // and show *all* debug_event frames when enabled.
  const DEBUG_LOG_ENABLED = debugMode;

  // Buffering is kept but gated behind DEBUG_LOG_ENABLED.
  const eventBufferRef = useRef<WsEvent[]>([]);
  const eventFlushTimerRef = useRef<number | null>(null);

  function flushDebugEvents() {
    if (!DEBUG_LOG_ENABLED) return;
    if (eventBufferRef.current.length === 0) return;
    const batch = eventBufferRef.current;
    eventBufferRef.current = [];
    // UI expects newest first.
    setEvents((prev) => [...batch.reverse(), ...prev].slice(0, 250));
  }

  function pushEvent(type: string, payload: any) {
    if (!DEBUG_LOG_ENABLED) return;
    // Keep it simple: when debug is on, log everything we explicitly push.
    eventBufferRef.current.push({ ts: nowIso(), type, payload });

    if (eventFlushTimerRef.current === null) {
      eventFlushTimerRef.current = window.setTimeout(() => {
        eventFlushTimerRef.current = null;
        flushDebugEvents();
      }, 250);
    }
  }

  const debugTurns = useMemo(() => {
    const byTurn = new Map<
      string,
      {
        turnId: string;
        events: Array<{ stage: string; tsIso?: string; tMs?: number; lat?: Record<string, number>; raw: any }>;
      }
    >();

    for (const ev of events) {
      if (ev.type !== "debug_event") continue;
      const p = ev.payload as DebugEventPayload;
      if (!p || !p.turn_id) continue;
      const entry = byTurn.get(p.turn_id) ?? { turnId: p.turn_id, events: [] };
      entry.events.push({
        stage: p.stage,
        tsIso: p.ts_iso,
        tMs: p.t_ms,
        lat: p.latencies_ms ?? undefined,
        raw: p,
      });
      byTurn.set(p.turn_id, entry);
    }

    // Sort turns newest first based on latest tMs (fallback to insertion order)
    const turns = Array.from(byTurn.values());
    turns.sort((a, b) => {
      const aLast = Math.max(...a.events.map((e) => (typeof e.tMs === "number" ? e.tMs : -1)));
      const bLast = Math.max(...b.events.map((e) => (typeof e.tMs === "number" ? e.tMs : -1)));
      return bLast - aLast;
    });

    // Sort events within a turn by tMs ascending
    for (const t of turns) {
      t.events.sort((a, b) => (a.tMs ?? 0) - (b.tMs ?? 0));
    }

    return turns;
  }, [events]);

  // Persist debug toggle & notify backend once we have a WS.
  useEffect(() => {
    try {
      localStorage.setItem("assistant_debug_mode", debugMode ? "true" : "false");
    } catch {
      // ignore
    }

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "set_debug_mode",
            enabled: debugMode,
          })
        );
      }
    } catch {
      // ignore
    }
  }, [debugMode]);

  // Chat updates are also frequent (partial transcripts / streaming). Batch them
  // to once-per-animation-frame to keep the UI responsive.
  const pendingTranscriptRef = useRef<string>("");
  const transcriptFlushRafRef = useRef<number | null>(null);

  const pendingAgentAppendRef = useRef<string>("");
  const agentFlushRafRef = useRef<number | null>(null);

  function scheduleTranscriptFlush() {
    if (transcriptFlushRafRef.current !== null) return;
    transcriptFlushRafRef.current = window.requestAnimationFrame(() => {
      transcriptFlushRafRef.current = null;
      const t = pendingTranscriptRef.current.trim();
      pendingTranscriptRef.current = "";
      // No-op: transcript turns are persisted directly to the singleton on receipt.
      // This RAF flush is kept to preserve prior batching behavior.
      void t;
    });
  }

  function scheduleAgentFlush() {
    if (agentFlushRafRef.current !== null) return;
    agentFlushRafRef.current = window.requestAnimationFrame(() => {
      agentFlushRafRef.current = null;
      const t = pendingAgentAppendRef.current;
      pendingAgentAppendRef.current = "";
      if (!t.trim()) return;
      // No-op: agent text is persisted streaming to the singleton on receipt.
    });
  }

  useEffect(() => {
    return () => {
      if (eventFlushTimerRef.current !== null) {
        window.clearTimeout(eventFlushTimerRef.current);
        eventFlushTimerRef.current = null;
      }
      flushDebugEvents();
      if (transcriptFlushRafRef.current !== null) {
        window.cancelAnimationFrame(transcriptFlushRafRef.current);
        transcriptFlushRafRef.current = null;
      }
      if (agentFlushRafRef.current !== null) {
        window.cancelAnimationFrame(agentFlushRafRef.current);
        agentFlushRafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushChatTurn(turn: Omit<ChatTurn, "id" | "ts"> & { ts?: string }) {
    // Persist to singleton so navigating away/back keeps the timeline.
    try {
      callSession.pushChatTurn(turn.speaker, turn.text);
    } catch {
      // ignore
    }
  }

  function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
    const out = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) out[i] = Math.max(-1, Math.min(1, pcm16[i] / 32768));
    return out;
  }

  function isWsOpen(): boolean {
    const ws = wsRef.current;
    return !!ws && ws.readyState === WebSocket.OPEN;
  }

  async function ensurePlaybackContext(sampleRate: number, opts?: { startBgNoise?: boolean }) {
    if (playbackContextRef.current) return playbackContextRef.current;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    playbackContextRef.current = ctx;
    playbackChainRef.current = { nextTime: ctx.currentTime };
    setSpeakerStatus("primed");
    pushEvent("speaker_ready", { sampleRate: ctx.sampleRate });

    // If background noise is enabled, initialize the noise chain for this context.
    // This is playback-only and mixes into ctx.destination.
    const shouldStartBgNoise = opts?.startBgNoise !== false;
    if (shouldStartBgNoise && getEffectiveBgNoiseConfig().enabled && isWsOpen()) {
      try {
        await ensureBgNoiseRunning(ctx);
      } catch {
        // best-effort; never block playback
      }
    }
    return ctx;
  }

  function persistBgNoiseSettings(assistantId: string, nextEnabled: boolean, nextVolume: number, nextUrl: string) {
    try {
      localStorage.setItem(`assistant_bg_noise_enabled_${assistantId}`, String(nextEnabled));
      localStorage.setItem(`assistant_bg_noise_volume_${assistantId}`, String(nextVolume));
      localStorage.setItem(`assistant_bg_noise_url_${assistantId}`, String(nextUrl));
    } catch {
      // ignore
    }
  }

  function loadBgNoiseLocalFallback(assistantId: string) {
    try {
      const enabledRaw = localStorage.getItem(`assistant_bg_noise_enabled_${assistantId}`);
      const volumeRaw = localStorage.getItem(`assistant_bg_noise_volume_${assistantId}`);
      const urlRaw = localStorage.getItem(`assistant_bg_noise_url_${assistantId}`);

      const enabled = enabledRaw === null ? undefined : enabledRaw === "true";
      const volume = volumeRaw === null ? undefined : Number(volumeRaw);
      const url = urlRaw === null ? undefined : urlRaw;

      return {
        enabled,
        volume: Number.isFinite(volume) ? volume : undefined,
        url,
      };
    } catch {
      return { enabled: undefined, volume: undefined, url: undefined };
    }
  }

  function getEffectiveBgNoiseConfig() {
    const locked = bgNoiseLockedConfigRef.current;
    if (bgNoiseLocked && locked) return locked;
    return { enabled: bgNoiseEnabled, volume: bgNoiseVolume, url: bgNoiseUrl };
  }

  async function loadNoiseBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    // Fetch + decode in the same AudioContext so sample-rate conversion is consistent.
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Failed to load background audio: ${res.status}`);
    const arr = await res.arrayBuffer();
    // decodeAudioData is callback-based in some browsers; wrap it.
    const buf: AudioBuffer = await new Promise((resolve, reject) => {
      const anyCtx: any = ctx as any;
      const p = anyCtx.decodeAudioData(arr, resolve, reject);
      if (p && typeof p.then === "function") (p as Promise<AudioBuffer>).then(resolve).catch(reject);
    });
    return buf;
  }

  async function ensureBgNoiseRunning(ctx: AudioContext) {
    const effective = getEffectiveBgNoiseConfig();
    const effectiveUrl = effective.url;
    const effectiveVolume = effective.volume;
    const effectiveGain = Math.min(1, Math.max(0, effectiveVolume / 100));

    // If already running, just sync level.
    if (bgNoiseGainRef.current && bgNoiseSourceRef.current) {
      bgNoiseGainRef.current.gain.setTargetAtTime(effectiveGain, ctx.currentTime, 0.02);
      return;
    }

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    bgNoiseGainRef.current = gain;

    // (Re)load buffer if URL changed or we don't have one yet.
    const key = `${effectiveUrl}@@${ctx.sampleRate}`;
    if (!bgNoiseBufferRef.current || bgNoiseBufferKeyRef.current !== key) {
      if (!effectiveUrl) throw new Error("No background sound selected");
      bgNoiseBufferRef.current = await loadNoiseBuffer(ctx, effectiveUrl);
      bgNoiseBufferKeyRef.current = key;
    }

    const src = ctx.createBufferSource();
    src.buffer = bgNoiseBufferRef.current;
    src.loop = true;
    src.connect(gain);
    src.start();
    bgNoiseSourceRef.current = src;

    // Ramp to target level (avoid clicks)
    gain.gain.setTargetAtTime(effectiveGain, ctx.currentTime, 0.05);
    pushEvent("bg_noise_started", { volume: effectiveVolume, url: effectiveUrl });
  }

  function stopPreview(reason: string) {
    const el = previewAudioRef.current;
    previewAudioRef.current = null;
    setPreviewPlaying(false);
    try {
      el?.pause();
    } catch {
      // ignore
    }
    try {
      if (el) el.currentTime = 0;
    } catch {
      // ignore
    }
    pushEvent("bg_noise_preview_stopped", { reason });
  }

  async function togglePreview() {
    if (bgNoiseLocked) return;

    if (previewPlaying) {
      stopPreview("toggle_off");
      return;
    }

    const url = bgNoiseUrl;
    if (!url) return;

    try {
      const el = new Audio(url);
      el.loop = true;
      el.volume = Math.min(1, Math.max(0, bgNoiseVolume / 100));
      previewAudioRef.current = el;
      await el.play();
      setPreviewPlaying(true);
      pushEvent("bg_noise_preview_started", { url, volume: bgNoiseVolume });
    } catch (e: any) {
      stopPreview("preview_error");
      toast({ variant: "destructive", title: "Preview failed", description: e?.message ?? "Unable to play preview" });
    }
  }

  function stopBgNoise(reason: string) {
    const ctx = playbackContextRef.current;
    const gain = bgNoiseGainRef.current;
    const src = bgNoiseSourceRef.current;
    bgNoiseGainRef.current = null;
    bgNoiseSourceRef.current = null;

    try {
      if (gain && ctx) {
        // fast ramp down to avoid pop
        try {
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        } catch {
          // ignore
        }
      }
      if (src) {
        try {
          src.stop();
        } catch {
          // ignore
        }
        try {
          src.disconnect();
        } catch {
          // ignore
        }
      }
      if (gain) {
        try {
          gain.disconnect();
        } catch {
          // ignore
        }
      }
    } finally {
      pushEvent("bg_noise_stopped", { reason });
    }
  }

  function stopAllPlayback(reason: string) {
    try {
      for (const n of playbackNodesRef.current) {
        try {
          n.stop();
        } catch {
          // ignore
        }
      }
      playbackNodesRef.current = [];
      if (playbackChainRef.current && playbackContextRef.current) {
        playbackChainRef.current.nextTime = playbackContextRef.current.currentTime;
      }
      isAiSpeakingRef.current = false;
      notifyWorkletAiState(false);  // Tell worklet AI stopped speaking
      setSpeakerStatus("stopped");
      pushEvent("speaker_stopped", { reason });
    } catch (e: any) {
      setSpeakerStatus("error");
      pushEvent("speaker_stop_error", { message: e?.message ?? String(e), reason });
    }
  }

  function sendInterrupt() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    // Prevent rapid-fire interrupts (200ms debounce)
    const now = Date.now();
    if (now - lastInterruptTimeRef.current < 200) return;
    lastInterruptTimeRef.current = now;
    
    // Send interrupt to backend
    ws.send(JSON.stringify({ type: "interrupt" }));
    pushEvent("interrupt_sent", { timestamp: now });
    
    // Stop local playback immediately
    stopAllPlayback("user_interrupt");
  }

  function calculateAudioEnergy(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  // Notify worklet about AI speaking state (for VAD-based interruption)
  function notifyWorkletAiState(isAiSpeaking: boolean) {
    const worklet = workletNodeRef.current;
    if (worklet?.port) {
      worklet.port.postMessage({
        type: 'aiSpeakingState',
        data: { isAiSpeaking }
      });
    }
  }

  async function playPcm16Chunk(base64Audio: string, sampleRate: number, epoch: number) {
    try {
      if (epoch !== callEpochRef.current) return;

      const ctx = await ensurePlaybackContext(sampleRate, { startBgNoise: true });
      if (epoch !== callEpochRef.current) return;
      if (ctx.state === "suspended") await ctx.resume();
      if (epoch !== callEpochRef.current) return;

      // Keep background noise state in sync with playback context.
      if (getEffectiveBgNoiseConfig().enabled && isWsOpen()) {
        try {
          await ensureBgNoiseRunning(ctx);
        } catch {
          // ignore
        }
      }

      const bytes = base64ToBytes(base64Audio);
      const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      const float32 = pcm16ToFloat32(pcm16);
      const buffer = ctx.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
  // NOTE: we connect TTS directly to destination; background noise is a
  // separate looped source also connected to destination.
  src.connect(ctx.destination);

      const chain = playbackChainRef.current;
      const startAt = chain ? Math.max(chain.nextTime, ctx.currentTime + 0.01) : ctx.currentTime + 0.01;
      src.start(startAt);
      isAiSpeakingRef.current = true;
      notifyWorkletAiState(true);  // Tell worklet AI is now speaking
      setSpeakerStatus("playing");

      playbackNodesRef.current.push(src);
      src.onended = () => {
        playbackNodesRef.current = playbackNodesRef.current.filter((n) => n !== src);
        if (playbackNodesRef.current.length === 0) {
          isAiSpeakingRef.current = false;
          notifyWorkletAiState(false);  // Tell worklet AI stopped speaking
          setSpeakerStatus((s) => (s === "playing" ? "primed" : s));
        }
      };

      const duration = float32.length / sampleRate;
      if (chain) chain.nextTime = startAt + duration;
    } catch (e: any) {
      setSpeakerStatus("error");
      pushEvent("speaker_play_error", { message: e?.message ?? String(e) });
    }
  }

  async function loadAgent() {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      // DB-backed assistant config (new assistants live in Postgres, not USERS_DB)
      const res = await surfaceApi.dashboard.getAssistant(encodeURIComponent(agentId));
      const a = res.assistant;

      // Hydrate per-assistant background noise settings.
      // Prefer DB fields; fall back to localStorage (per assistant) if DB unset.
      try {
        const local = loadBgNoiseLocalFallback(String(a.assistant_id));
        const enabled = typeof a.bg_noise_enabled === "boolean" ? a.bg_noise_enabled : local.enabled;
        const volume = Number.isFinite(Number(a.bg_noise_volume)) ? Number(a.bg_noise_volume) : local.volume;
        const url = typeof a.bg_noise_url === "string" ? a.bg_noise_url : local.url;

        if (typeof enabled === "boolean") setBgNoiseEnabled(enabled);
        if (typeof volume === "number") setBgNoiseVolume(Math.min(100, Math.max(0, Math.round(volume))));
        if (typeof url === "string") setBgNoiseUrl(url);
      } catch {
        // ignore
      } finally {
        bgNoiseAssistantHydratedRef.current = true;
      }

      setAgent({
        id: String(a.assistant_id),
        display_name: a.display_name ?? undefined,
        script_text: a.script_text ?? undefined,
        speaker_id: a.speaker_id ?? null,
        intro_message: a.intro_message ?? null,
        linked_dialing_file_id: (a as any)?.linked_dialing_file_id ?? null,
      });
      setScriptText(a.script_text ?? "");
      setSelectedVoice(a.speaker_id ?? null);
      setIntroMessage(a.intro_message ?? "");
      setLinkedDialingFileId(((a as any)?.linked_dialing_file_id ?? null) as any);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load agent";
      setError(msg);
      toast({ variant: "destructive", title: "Agent", description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function loadDialingFiles() {
    setDialingFilesLoading(true);
    try {
      const res = await surfaceApi.dialingData.listFiles();
      const files = (res.files ?? []).map((f) => ({
        id: Number(f.id),
        original_filename: String(f.original_filename ?? ""),
        row_count: Number(f.row_count ?? 0),
      }));
      setDialingFiles(files);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Dialing Data", description: e?.message ?? "Failed to load files" });
    } finally {
      setDialingFilesLoading(false);
    }
  }

  async function saveDialingLink() {
    if (!agentId) return;
    setSavingDialingLink(true);
    try {
      const res = await surfaceApi.dialingData.linkAssistantFile(agentId, linkedDialingFileId);
      const next = res.assistant;
      setAgent((prev) => (prev ? { ...prev, linked_dialing_file_id: next.linked_dialing_file_id } : prev));
      toast({ title: "Saved", description: "Dialing file link updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message ?? "Failed to update link" });
    } finally {
      setSavingDialingLink(false);
    }
  }

  // Reset assistant-scoped hydration when switching assistants.
  useEffect(() => {
    bgNoiseAssistantHydratedRef.current = false;
    if (bgNoiseAssistantSaveTimerRef.current !== null) {
      window.clearTimeout(bgNoiseAssistantSaveTimerRef.current);
      bgNoiseAssistantSaveTimerRef.current = null;
    }
  }, [agentId]);

  useEffect(() => {
    void loadDialingFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function saveAgent() {
    if (!agentId) return;
    const configLockedNow =
      callStarting ||
      wsStatus === "connecting" ||
      wsStatus === "connected" ||
      wsStatus === "reconnecting" ||
      micStatus === "streaming";
    if (configLockedNow) {
      toast({
        variant: "destructive",
        title: "Call active",
        description: "Stop the call before saving script changes.",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await surfaceApi.dashboard.updateAssistant(encodeURIComponent(agentId), {
        script_text: scriptText,
      });
      const a = res.assistant;
      setAgent({
        id: String(a.assistant_id),
        display_name: a.display_name ?? undefined,
        script_text: a.script_text ?? undefined,
        speaker_id: a.speaker_id ?? null,
        intro_message: a.intro_message ?? null,
      });
      setScriptText(a.script_text ?? "");
      toast({ title: "Saved", description: "Script updated" });
    } catch (e: any) {
      const msg = e?.message ?? "Failed to save";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSaving(false);
    }
  }

  async function saveVoice() {
    if (!agentId) return;
    const configLockedNow =
      callStarting ||
      wsStatus === "connecting" ||
      wsStatus === "connected" ||
      wsStatus === "reconnecting" ||
      micStatus === "streaming";
    if (configLockedNow) {
      toast({
        variant: "destructive",
        title: "Call active",
        description: "Stop the call before changing voice settings.",
      });
      return;
    }
    setSavingVoice(true);
    try {
      const res = await surfaceApi.dashboard.updateAssistantVoice(
        encodeURIComponent(agentId),
        selectedVoice,
      );
      const a = res.assistant;
      setAgent((prev) => prev ? { ...prev, speaker_id: a.speaker_id ?? null } : prev);
      setSelectedVoice(a.speaker_id ?? null);
      toast({ title: "Voice saved", description: "Warming up voice…" });

      // Fire-and-forget warmup in the background so TTS is pre-cached
      const speakerToWarm = a.speaker_id ?? null;
      if (speakerToWarm) {
        setWarmingUpVoice(true);
        // Pass the current intro message so the warmup pre-caches the
        // assistant's own opening line with the newly selected voice.
        const introToWarm = introMessage.trim() || undefined;
        surfaceApi.dashboard
          .warmupAssistantVoice(encodeURIComponent(agentId), speakerToWarm, introToWarm)
          .then((r) => {
            toast({
              title: "Voice ready",
              description: `${r.cached} phrases pre-cached for instant playback.`,
            });
          })
          .catch(() => {
            // warmup is best-effort; don't bother the user
          })
          .finally(() => setWarmingUpVoice(false));
      }
    } catch (e: any) {
      const msg = e?.message ?? "Failed to save voice";
      toast({ variant: "destructive", title: "Voice save failed", description: msg });
    } finally {
      setSavingVoice(false);
    }
  }

  async function saveIntro() {
    if (!agentId) return;
    const configLockedNow =
      callStarting ||
      wsStatus === "connecting" ||
      wsStatus === "connected" ||
      wsStatus === "reconnecting" ||
      micStatus === "streaming";
    if (configLockedNow) {
      toast({
        variant: "destructive",
        title: "Call active",
        description: "Stop the call before saving intro message changes.",
      });
      return;
    }
    const trimmed = introMessage.trim();
    if (!trimmed) {
      toast({ variant: "destructive", title: "Intro required", description: "Please enter a First Intro Message before saving." });
      return;
    }
    setSavingIntro(true);
    try {
      const res = await surfaceApi.dashboard.updateAssistantIntro(encodeURIComponent(agentId), trimmed);
      setAgent((prev) => prev ? { ...prev, intro_message: res.intro_message } : prev);
      setIntroMessage(res.intro_message);
      toast({ title: "Intro saved", description: "First Intro Message updated." });
    } catch (e: any) {
      const msg = e?.message ?? "Failed to save intro message";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSavingIntro(false);
    }
  }

  function closeWs() {
    const ws = wsRef.current;
    wsRef.current = null;
    try {
      ws?.close();
    } catch {
      // ignore
    }
    setWsStatus("disconnected");
  }

  async function cleanupPlayback() {
    try {
      stopBgNoise("cleanup");
      stopAllPlayback("cleanup");
      const ctx = playbackContextRef.current;
      playbackContextRef.current = null;
      playbackChainRef.current = null;
      if (ctx) {
        try {
          await ctx.close();
        } catch {
          // ignore
        }
      }
      setSpeakerStatus("idle");
    } catch {
      // ignore
    }
  }

  // Load available background noises from manifest in /public/bg-noise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBgNoiseManifestError(null);
        const res = await fetch("/bg-noise/manifest.json", { cache: "no-cache" });
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        const manifest = (await res.json()) as BgNoiseManifest;
        const sounds = Array.isArray(manifest?.sounds) ? manifest.sounds : [];
        const opts = sounds
          .filter((s) => s && typeof s.id === "string" && typeof s.label === "string" && typeof s.file === "string")
          .map((s) => ({ id: s.id, label: s.label, url: `/bg-noise/${encodeURIComponent(s.file)}` }));
        if (cancelled) return;
        setBgNoiseOptions(opts);

        // Choose a default if none selected yet.
        if (!bgNoiseLocked && (!bgNoiseUrl || !opts.some((o) => o.url === bgNoiseUrl))) {
          setBgNoiseUrl(opts[0]?.url ?? "");
        }
      } catch (e: any) {
        if (cancelled) return;
        setBgNoiseOptions([]);
        setBgNoiseManifestError(e?.message ?? "Failed to load background sounds");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist + apply noise settings (but never mutate mid-call).
  useEffect(() => {
    const configLockedNow =
      callStarting ||
      wsStatus === "connecting" ||
      wsStatus === "connected" ||
      wsStatus === "reconnecting" ||
      micStatus === "streaming";

    if (!bgNoiseLocked && !configLockedNow) {
      if (agentId) persistBgNoiseSettings(String(agentId), bgNoiseEnabled, bgNoiseVolume, bgNoiseUrl);

      // Debounced per-assistant DB persistence.
      if (agentId && bgNoiseAssistantHydratedRef.current) {
        try {
          if (bgNoiseAssistantSaveTimerRef.current !== null) {
            window.clearTimeout(bgNoiseAssistantSaveTimerRef.current);
            bgNoiseAssistantSaveTimerRef.current = null;
          }

          bgNoiseAssistantSaveTimerRef.current = window.setTimeout(() => {
            bgNoiseAssistantSaveTimerRef.current = null;
            void surfaceApi.dashboard.updateAssistant(encodeURIComponent(String(agentId)), {
              bg_noise_enabled: bgNoiseEnabled,
              bg_noise_volume: bgNoiseVolume,
              bg_noise_url: bgNoiseUrl,
            });
          }, 500);
        } catch {
          // ignore
        }
      }
    }

    if (!bgNoiseEnabled && previewPlaying) {
      stopPreview("disabled");
    }

    const ctx = playbackContextRef.current;
    if (!ctx) return;

    if (getEffectiveBgNoiseConfig().enabled) {
      ensureBgNoiseRunning(ctx).catch(() => {
        /* ignore */
      });
    } else {
      stopBgNoise("disabled");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgNoiseEnabled, bgNoiseVolume, bgNoiseUrl, bgNoiseLocked, previewPlaying, agentId, callStarting, wsStatus, micStatus]);

  // Keep preview audio volume in sync.
  useEffect(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, bgNoiseVolume / 100));
  }, [bgNoiseVolume]);

  useEffect(() => {
    return () => {
      stopPreview("unmount");
      if (bgNoiseAssistantSaveTimerRef.current !== null) {
        window.clearTimeout(bgNoiseAssistantSaveTimerRef.current);
        bgNoiseAssistantSaveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Freeze *all* config changes once Start Call is pressed (and while the call is active).
  useEffect(() => {
    const configLockedNow =
      callStarting ||
      wsStatus === "connecting" ||
      wsStatus === "connected" ||
      wsStatus === "reconnecting" ||
      micStatus === "streaming";

    if (configLockedNow && !bgNoiseLocked) {
      // Hard guarantee: cancel any pending debounced DB write before the call begins.
      if (bgNoiseAssistantSaveTimerRef.current !== null) {
        window.clearTimeout(bgNoiseAssistantSaveTimerRef.current);
        bgNoiseAssistantSaveTimerRef.current = null;
      }

      setBgNoiseLocked(true);
      bgNoiseLockedConfigRef.current = {
        enabled: bgNoiseEnabled,
        volume: bgNoiseVolume,
        url: bgNoiseUrl,
      };
      stopPreview("call_started");
      pushEvent("bg_noise_locked", { url: bgNoiseUrl, volume: bgNoiseVolume, enabled: bgNoiseEnabled });
      return;
    }

    if (!configLockedNow && bgNoiseLocked) {
      setBgNoiseLocked(false);
      bgNoiseLockedConfigRef.current = null;
      pushEvent("bg_noise_unlocked", {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStarting, wsStatus, micStatus]);

  async function stopMicStreaming() {
    try {
      const processor = processorRef.current;
      const src = audioSourceRef.current;
      const ctx = audioContextRef.current;
      const workletNode = workletNodeRef.current;
      processorRef.current = null;
      audioSourceRef.current = null;
      audioContextRef.current = null;
      workletNodeRef.current = null;
      if (processor) {
        try {
          processor.disconnect();
        } catch {
          // ignore
        }
      }
      if (workletNode) {
        try {
          workletNode.port.onmessage = null;
        } catch {
          // ignore
        }
        try {
          workletNode.disconnect();
        } catch {
          // ignore
        }
      }
      if (src) {
        try {
          src.disconnect();
        } catch {
          // ignore
        }
      }
      if (ctx) {
        try {
          await ctx.close();
        } catch {
          // ignore
        }
      }

      const ms = mediaStreamRef.current;
      mediaStreamRef.current = null;
      if (ms) {
        for (const t of ms.getTracks()) t.stop();
      }
      micStatusRef.current = "idle";
      setMicStatus("stopped");
      pushEvent("mic_stopped", {});
    } catch (e: any) {
      micStatusRef.current = "idle";
      setMicStatus("error");
      pushEvent("mic_stop_error", { message: e?.message ?? String(e) });
    }
  }

  function floatTo16BitPCM(input: Float32Array): Int16Array {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  function downsampleBuffer(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (outputRate === inputRate) return input;
    const ratio = inputRate / outputRate;
    const newLength = Math.round(input.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
        accum += input[i];
        count++;
      }
      result[offsetResult] = count ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function startMicStreaming() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    if (micStatusRef.current === "streaming" || micStatusRef.current === "starting") return;

    micStatusRef.current = "starting";
    setMicStatus("starting");
    pushEvent("mic_starting", {});

    try {
    // Prefer 16kHz input but fallback is fine; we downsample.
    const media = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = media;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 48000,
    });
    audioContextRef.current = ctx;

    const source = ctx.createMediaStreamSource(media);
    audioSourceRef.current = source;

    // Prefer AudioWorkletNode (runs audio processing off the main thread).
    // Fallback to ScriptProcessorNode only if worklets aren't available.
    const canUseWorklet = !!(ctx.audioWorklet && (window as any).AudioWorkletNode);
    if (canUseWorklet) {
      try {
        // The worklet module lives in /public so it can be loaded by URL.
        await ctx.audioWorklet.addModule("/audio-worklet-processor.js");

        const node = new AudioWorkletNode(ctx, "audio-worklet-processor");
        workletNodeRef.current = node;

        node.port.onmessage = (event: MessageEvent) => {
          try {
            const msg = (event as any).data;
            if (msg?.type === "audioData" && msg?.data) {
              const pcm16buf = msg.data as ArrayBuffer;
              const u8 = new Uint8Array(pcm16buf);
              const b64 = bytesToBase64(u8);
              ws.send(JSON.stringify({ type: "audio_stream_realtime", data: b64 }));
              return;
            }

            // VAD-based interruption: worklet detected user speech while AI is speaking
            if (msg?.type === "userInterrupt") {
              // We still execute the interrupt, but we don't need to spam the UI log.
              pushEvent("interrupt_detected_by_vad", msg.data);
              sendInterrupt();
              return;
            }

            // Optional: surface VAD results in debug log (can be noisy; keep as event)
            if (msg?.type === "vadResult") {
              // Keep hook, but filtered out of UI by DEBUG_LOG_DROP_TYPES.
              pushEvent("vad", msg.data);
              return;
            }
          } catch (e: any) {
            setMicStatus("error");
            // Still surface errors for operator reliability.
            console.warn("mic_stream_error", e);
            pushEvent("mic_stream_error", { message: e?.message ?? String(e) });
          }
        };

        source.connect(node);
        // Some browsers require the node to be connected to destination to keep processing alive.
        node.connect(ctx.destination);
      } catch (e: any) {
        // Worklet failed to init; fall back to ScriptProcessorNode.
        console.warn("mic_worklet_fallback", e);
        pushEvent("mic_worklet_fallback", { message: e?.message ?? String(e) });
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (event) => {
          try {
            const inputData = event.inputBuffer.getChannelData(0);
            
            // INTERRUPTION DETECTION: Check for user speech while AI is speaking
            if (isAiSpeakingRef.current) {
              const energy = calculateAudioEnergy(inputData);
              // Threshold: 0.02 = moderate speech (adjust if needed)
              if (energy > 0.02) {
                sendInterrupt();
              }
            }
            
            const down = downsampleBuffer(inputData, ctx.sampleRate, 16000);
            const pcm16 = floatTo16BitPCM(down);
            const u8 = new Uint8Array(pcm16.buffer);
            const b64 = bytesToBase64(u8);
            ws.send(JSON.stringify({ type: "audio_stream_realtime", data: b64 }));
          } catch (err: any) {
            setMicStatus("error");
            console.warn("mic_stream_error", err);
            pushEvent("mic_stream_error", { message: err?.message ?? String(err) });
          }
        };
        source.connect(processor);
        processor.connect(ctx.destination);
      }
    } else {
      // ScriptProcessor is deprecated but still widely supported.
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        try {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // INTERRUPTION DETECTION: Check for user speech while AI is speaking
          if (isAiSpeakingRef.current) {
            const energy = calculateAudioEnergy(inputData);
            // Threshold: 0.02 = moderate speech (adjust if needed)
            if (energy > 0.02) {
              sendInterrupt();
            }
          }
          
          const down = downsampleBuffer(inputData, ctx.sampleRate, 16000);
          const pcm16 = floatTo16BitPCM(down);
          const u8 = new Uint8Array(pcm16.buffer);
          const b64 = bytesToBase64(u8);
          ws.send(JSON.stringify({ type: "audio_stream_realtime", data: b64 }));
        } catch (e: any) {
          setMicStatus("error");
          console.warn("mic_stream_error", e);
          pushEvent("mic_stream_error", { message: e?.message ?? String(e) });
        }
      };
      source.connect(processor);
      processor.connect(ctx.destination);
    }
    micStatusRef.current = "streaming";
    setMicStatus("streaming");
    pushEvent("mic_streaming", { sampleRate: ctx.sampleRate });
    } catch (e: any) {
      // Reset micStatusRef so the mic can be started again after an error.
      micStatusRef.current = "idle";
      throw e;
    }
  }

  // ── Stop Call ──────────────────────────────────────────────────────────────
  // Single entry point so every resource is torn down synchronously the moment
  // the button is pressed — no stale logs, no lingering audio, no pending timers.
  async function handleStopCall() {
    // Invalidate any in-flight WS message handler *before* doing anything else.
    // This is the critical fix: late ai_response_chunk frames must not be able to
    // restart playback after we've stopped it.
    callEpochRef.current += 1;
    try {
      const ws = wsRef.current;
      if (ws) {
        try {
          ws.onmessage = null;
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    // 1. Cancel any pending debug/transcript flush timers immediately.
    if (eventFlushTimerRef.current !== null) {
      window.clearTimeout(eventFlushTimerRef.current);
      eventFlushTimerRef.current = null;
    }
    if (transcriptFlushRafRef.current !== null) {
      window.cancelAnimationFrame(transcriptFlushRafRef.current);
      transcriptFlushRafRef.current = null;
    }
    if (agentFlushRafRef.current !== null) {
      window.cancelAnimationFrame(agentFlushRafRef.current);
      agentFlushRafRef.current = null;
    }
    // Reset in-memory buffers so stale text can't flush later.
    eventBufferRef.current = [];
    pendingTranscriptRef.current = "";
    pendingAgentAppendRef.current = "";

    // Also stop any background-noise preview element (separate from in-call noise).
    stopPreview("stop_call");

    // Close WS as early as possible to stop any new server-driven audio frames.
    closeWs();

    // Stop mic pipeline immediately too (worklet/script processor can be connected
    // to destination to keep processing alive; we want absolute silence).
    await stopMicStreaming();

    // 2. Stop all TTS playback immediately (silence the speaker).
    stopAllPlayback("stop_call");
    await cleanupPlayback();

    // 3. Delegate to singleton — wipes ws, mic, chat, events, callFlowStatus in one emit.
    //    AssistantConfig's syncFromGlobal subscriber will pick up the reset state.
    callSession.stopCall();

    // 4. Force-reset any local state that syncFromGlobal might miss.
    setCallFlowStatus("idle");
    setChat([]);
    setEvents([]);
    setPartialUserText("");
    setCurrentCustomer(null);
    setWsStatus("disconnected");
    setMicStatus("idle");
    setSpeakerStatus("idle");
  }

  async function startCalling() {
    if (!agentId) return;

    // Block call if no intro message is configured.
    if (!agent?.intro_message?.trim()) {
      toast({
        variant: "destructive",
        title: "Intro message required",
        description: "Please save a First Intro Message before starting a call.",
      });
      return;
    }

    // If the user just tweaked background noise settings, we may have a pending
    // debounced DB write. Starting a call will lock config and cancel that timer,
    // which can make the backend session read stale settings.
    // Flush once up-front so the call reliably uses the saved configuration.
    if (bgNoiseAssistantSaveTimerRef.current !== null) {
      window.clearTimeout(bgNoiseAssistantSaveTimerRef.current);
      bgNoiseAssistantSaveTimerRef.current = null;
      try {
        await surfaceApi.dashboard.updateAssistant(encodeURIComponent(String(agentId)), {
          bg_noise_enabled: bgNoiseEnabled,
          bg_noise_volume: bgNoiseVolume,
          bg_noise_url: bgNoiseUrl,
        });
      } catch (e: any) {
        const msg = e?.message ?? "Failed to save background noise settings";
        toast({ variant: "destructive", title: "Start call blocked", description: msg });
        return;
      }
    }

    setCallStarting(true);
    try {
      // New call => new epoch. Any previous WS handlers must be considered stale.
      const myEpoch = (callEpochRef.current += 1);

      const token = getAuthToken();
      if (!token) throw new Error("No access token. Please log in again.");

      // Operator flow: ask backend to create a fresh session for this agent, owned by current operator.
      const opsPrefix = isPayg ? "/api/payg" : "/api/cc";
      const created = await api.post<{ session_id: string; agent_id: string }>(
        `${opsPrefix}/operator/agents/${encodeURIComponent(agentId)}/session`
      );
      sessionIdRef.current = created.session_id;
      pushEvent("session_created", created);

      const wsUrl = getWsUrl().replace(/\/$/, "");
      pushEvent("ws_connect_attempt", {
        base: wsUrl,
        full: `${wsUrl}/ws/${created.session_id}`,
      });

      setWsStatus("connecting");
      // Pass token for WS auth. Server supports Authorization header OR query param.
      // Browsers can't set custom headers easily, so we use query param here.
      const ws = new WebSocket(`${wsUrl}/ws/${created.session_id}?access_token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      // attachWs owns ALL ws.on* handlers — do NOT set ws.onopen/etc here.
      // Pass onOpenExtra so start_call + mic start happen at the right moment.
      callSession.attachWs(
        ws,
        { agentId, sessionId: created.session_id },
        (openWs) => {
          openWs.send(JSON.stringify({ type: "start_call" }));
          pushEvent("ws_send", { type: "start_call" });
          startMicStreaming().catch((e: any) => {
            setMicStatus("error");
            pushEvent("mic_error", { message: e?.message ?? String(e) });
          });
        },
      );

      ws.onmessage = (ev) => {
        // Hard guard: if Stop Call was pressed (or a new call started), ignore any
        // late frames so they can't re-start playback/background noise.
        if (myEpoch !== callEpochRef.current) return;
        if (wsRef.current !== ws) return;

        try {
          const parsed = JSON.parse(ev.data);

          // Keep callSession singleton in sync (callFlowStatus, customer, partials, event log).
          callSession.handleMessage(parsed);

          // Track call flow status for modal display
          
          // Connection ready - set to idle initially
          if (parsed?.type === "connection_ready") {
            setCallFlowStatus("idle");
          }
          
          // When start_call is processed, show warming overlay briefly.
          // It will be dismissed immediately when call_started arrives (~100ms later).
          if (parsed?.type === "start_call") {
            setCallFlowStatus("warming");
          }

          // call_started = backend finished warmup and began the call.
          // Dismiss the "Warming Up..." overlay immediately.
          if (parsed?.type === "call_started") {
            setCallFlowStatus((current) =>
              current === "warming" ? "idle" : current
            );
          }

          // New customer details received when call starts
          // Backend currently emits customer info as `calling_index_assigned`.
          if (parsed?.type === "calling_index_assigned") {
            // Agent is ready - warmup complete
            setCallFlowStatus("ready");
            
            // Auto-dismiss "ready" status after 2 seconds
            setTimeout(() => {
              setCallFlowStatus((current) => {
                if (current === "ready") {
                  return "idle";
                }
                return current;
              });
            }, 2000);
            
            // When a new call is assigned we want to clear previous call state
            // (previous chat / debug events) and hide any end-call modal that
            // might still be visible from the prior call. Then set the new
            // customer index.
            setEvents([]);
            setChat([]);
            callSession.clearChat();
            setPartialUserText("");
            pendingTranscriptRef.current = "";
            pendingAgentAppendRef.current = "";
            const index = parsed?.index ?? parsed?.customer_index;
            const name = parsed?.name ?? parsed?.customer_name ?? parsed?.customerName;
            const number = parsed?.phone_number ?? parsed?.phone ?? parsed?.number;
            setCurrentCustomer((prev) => ({
              ...(prev ?? {}),
              index,
              name: typeof name === "string" ? name : prev?.name,
              number: typeof number === "string" ? number : prev?.number,
            }));
          }

          // Support a future/alternate event name too.
          if (parsed?.type === "customer_details") {
            const data = parsed?.data ?? parsed?.payload ?? parsed;
            const index = data?.customer_index ?? data?.index ?? data?.customerIndex;
            const name = data?.name ?? data?.customer_name ?? data?.full_name;
            const number = data?.phone_number ?? data?.phone ?? data?.number;
            setCurrentCustomer((prev) => ({
              ...(prev ?? {}),
              index: index ?? prev?.index,
              name: typeof name === "string" ? name : prev?.name,
              number: typeof number === "string" ? number : prev?.number,
            }));
          }

          // TTS audio from backend
          if (parsed?.type === "ai_response_chunk" && parsed?.audio) {
            const sr = typeof parsed?.sample_rate === "number" ? parsed.sample_rate : 22050;
            void playPcm16Chunk(parsed.audio, sr, myEpoch);
          }

          // Backend sends these to force stop when interrupted / transitioning
          if (
            parsed?.type === "stop_audio" ||
            parsed?.type === "clear_audio_buffers" ||
            parsed?.type === "audio_interrupt"
          ) {
            stopAllPlayback(parsed?.type ?? "stop_audio");
            // If the backend force-stops audio, clear any in-progress partial text.
            setPartialUserText("");
          }

          // Convert WS events into a clean transcript/response timeline.
          // Backend may send:
          // - transcription / partial_transcription (user)
          // - ai_partial_response (agent text stream)
          // - ai_response_end (end marker)
          if (parsed?.type === "transcription") {
            const t = parsed?.text ?? parsed?.transcript ?? parsed?.data?.text ?? "";
            if (typeof t === "string" && t.trim()) {
              // Commit the final transcript and clear the transient partial.
              setPartialUserText("");
              // Persist immediately so returning to the page shows history.
              callSession.pushChatTurn("user", t);
            }
          }

          if (parsed?.type === "partial_transcription") {
            const t = parsed?.text ?? parsed?.transcript ?? parsed?.data?.text ?? "";
            if (typeof t === "string") {
              // Only render meaningful partials.
              const cleaned = t.replace(/\s+/g, " ").trim();
              if (cleaned) setPartialUserText(cleaned);
            }
          }

          if (parsed?.type === "user_interrupt_detected") {
            // A new utterance is interrupting; clear partial UI to avoid mixing text.
            setPartialUserText("");
          }

          if (parsed?.type === "ai_partial_response") {
            const t = parsed?.text;
            if (typeof t === "string" && t.trim()) {
              // Persist streaming agent output.
              callSession.appendAgentText(t);
            }
          }

          if (parsed?.type === "ai_response_end") {
            // No-op for now; leaving marker available in debug.
          }

          // Backend pipeline debug events (authority): store so the UI can group by turn_id.
          if (parsed?.type === "debug_event") {
            pushEvent("debug_event", parsed);
          }

          // Surface STT health so the operator immediately knows why transcripts are missing.
          // Only log failures to the debug panel.
          if (parsed?.type === "stt_status") {
            const status = parsed?.status;
            if (status === "connected") {
              setSttStatus({ status: "connected" });
            } else if (status === "failed") {
              const message = parsed?.message ?? parsed?.detail;
              setSttStatus({ status: "failed", message });
              pushEvent("stt_status_failed", { message });
            }
          }

          // Call ended — show modal and perform background cleanup tasks.
          if (parsed?.type === "call_ended") {
            pushEvent("call_ended", parsed);
            
            // Move to ending status
            setCallFlowStatus("ending");

            // Clear UI immediately so the next call starts fresh.
            setChat([]);
            callSession.clearChat();
            setEvents([]);
            setCurrentCustomer(null);
            setPartialUserText("");
            pendingTranscriptRef.current = "";
            pendingAgentAppendRef.current = "";

            (async () => {
              try {
                if (myEpoch !== callEpochRef.current) return;

                // Move to cleanup status
                setCallFlowStatus("cleanup");
                
                // NOTE: We do NOT stop mic streaming here - keep it running for auto-next-call.
                // The mic will only stop when the WebSocket closes (ws.onclose).
                // await stopMicStreaming();
                
                await cleanupPlayback();
                if (myEpoch !== callEpochRef.current) return;
                // Prime playback context to reduce first-audio latency on the next call.
                try {
                  // Prime without starting background noise.
                  await ensurePlaybackContext(22050, { startBgNoise: false });
                } catch {
                  // ignore
                }
                pushEvent("endcall_local_cleanup_done", {});
                
                // After cleanup, wait a moment then check if we're auto-starting next call
                // If not, return to idle
                setTimeout(() => {
                  setCallFlowStatus((current) => {
                    // Only return to idle if we haven't moved to warming/ready yet
                    if (current === "cleanup") {
                      return "idle";
                    }
                    return current;
                  });
                }, 1000);
              } catch (e: any) {
                pushEvent("endcall_local_cleanup_error", { message: e?.message ?? String(e) });
                setCallFlowStatus("idle");
              }
            })();
          }

          // FULL AUTONOMY: backend tells us it is starting the next call.
          // In the current backend, this event is emitted before the next call
          // actually begins, and *may* come before `calling_index_assigned`.
          // Treat it as a "new call progression" signal and clear local UI state
          // so the next customer starts clean.
          if (parsed?.type === "auto_start_next_call" || parsed?.type === "auto_start_first_call") {
            // Move to warming status for next call
            setCallFlowStatus("warming");
            
            // Safety timeout: if no calling_index_assigned arrives in 10 seconds, return to idle
            setTimeout(() => {
              setCallFlowStatus((current) => {
                if (current === "warming") {
                  console.warn("Warming state timeout - returning to idle");
                  return "idle";
                }
                return current;
              });
            }, 10000);
            
            const nextIndex = parsed?.customer_index ?? parsed?.index ?? parsed?.customerIndex;
            setEvents([]);
            setChat([]);
            callSession.clearChat();
            setPartialUserText("");
            setCurrentCustomer((prev) => ({
              ...(prev ?? {}),
              index: typeof nextIndex === "number" || typeof nextIndex === "string" ? nextIndex : prev?.index,
            }));
            pendingTranscriptRef.current = "";
            pendingAgentAppendRef.current = "";

          }

          // Do not log raw WS traffic in the UI.
        } catch {
          // Ignore malformed frames in UI log.
        }
      };

    } catch (e: any) {
      const msg = e?.message ?? "Failed to start calling";
      toast({ variant: "destructive", title: "Start calling", description: msg });
    } finally {
      setCallStarting(false);
    }
  }

  useEffect(() => {
    void loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const configLocked =
    callStarting ||
    wsStatus === "connecting" ||
    wsStatus === "connected" ||
    wsStatus === "reconnecting" ||
    micStatus === "streaming";

  const isDialingLinkDirty = useMemo(() => {
    const current = agent?.linked_dialing_file_id ?? null;
    return (linkedDialingFileId ?? null) !== (current ?? null);
  }, [agent?.linked_dialing_file_id, linkedDialingFileId]);

  const debugEvents = events;

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6">
        <p className="mb-4 text-center text-muted-foreground">{error}</p>
        <Button asChild>
          <Link to={assistantsPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assistants
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      {/* ── Header: Back + Name (left) | Start Call (right, same row) ── */}
      <div data-reveal className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
            <Link to={assistantsPath}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            {/* Editable assistant name */}
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  ref={nameInputRef}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitNameEdit();
                    if (e.key === "Escape") cancelNameEdit();
                  }}
                  onBlur={commitNameEdit}
                  className="h-8 py-0 px-2 text-lg font-semibold bg-muted/60 border-primary/40 focus-visible:ring-1 focus-visible:ring-primary w-52"
                  disabled={savingName}
                  autoFocus
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); commitNameEdit(); }}
                  className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                  disabled={savingName}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); cancelNameEdit(); }}
                  className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 className="font-display text-h1 text-foreground">{agent?.display_name ?? agentId}</h1>
                {agent && (
                  <button
                    onClick={startNameEdit}
                    className="opacity-0 group-hover/title:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    title="Rename assistant"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground font-mono">{agentId}</p>
          </div>
        </div>

        {/* Start Call / Stop Call controls — horizontally opposite assistant name */}
        <div className="flex items-center gap-2">
          {sttStatus?.status === "failed" && (
            <span className="text-xs text-destructive mr-2">STT unavailable</span>
          )}
          {wsStatus === "connected" ? (
            <Button onClick={() => handleStopCall()} variant="outline" size="lg">
              Stop Call
            </Button>
          ) : (
            <Button
              onClick={() => startCalling()}
              disabled={callStarting || wsStatus === "connecting" || !agent?.intro_message?.trim()}
              size="lg"
            >
              {callStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Call
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground ml-2">
            <WsSignalHud status={wsStatus} />
            <span className={
              wsStatus === "connected" ? "text-primary" :
              wsStatus === "reconnecting" || wsStatus === "connecting" ? "text-accent-foreground" :
              wsStatus === "error" ? "text-destructive" : ""
            }>
              {wsStatus}
            </span>
            <span>·</span>
            <span>{micStatus}</span>
            <span>·</span>
            <span>{speakerStatus}</span>
          </div>
        </div>
      </div>

      {/* Reconnecting banner — shown while WS is reconnecting */}
      {(wsStatus === "reconnecting" || wsStatus === "connecting") && (
        <div
          className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent-foreground"
          data-reveal
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
          {wsStatus === "reconnecting" ? "Re-establishing connection…" : "Connecting…"}
        </div>
      )}

      {/* Current customer banner (visible during call) */}
      {wsStatus === "connected" && currentCustomer && (
        <div data-reveal className="rounded-md border border-border bg-muted/50 p-3 text-sm">
          <p className="font-semibold text-foreground">
            {typeof currentCustomer.index !== "undefined" && currentCustomer.index !== null
              ? `Customer #${String(currentCustomer.index)}`
              : "Customer"}
            {currentCustomer.name?.trim() ? ` — ${currentCustomer.name}` : ""}
          </p>
          {currentCustomer.number?.trim() ? (
            <p className="text-muted-foreground">{currentCustomer.number}</p>
          ) : null}
        </div>
      )}

      {/* ── Main Content Area (2 columns) ── */}
      <div className="flex-1 grid lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Column: Config (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Top Section: Voice settings + Background noise settings */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Voice */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Assistant Voice
                </CardTitle>
                <CardDescription>Select the voice used for calls.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedVoice ?? "__default__"}
                    onValueChange={(v) => {
                      if (configLocked) return;
                      setSelectedVoice(v === "__default__" ? null : v);
                    }}
                    disabled={configLocked}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices?.map((v) => (
                        <SelectItem key={v.speaker_id} value={v.speaker_id}>
                          {v.display_name} — {v.accent} ({v.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => saveVoice()}
                    disabled={configLocked || savingVoice || !isVoiceDirty}
                    size="sm"
                    className="shrink-0"
                  >
                    {savingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                {warmingUpVoice && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Warming up voice for instant playback…</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Background noise */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Background Noise</CardTitle>
                <CardDescription>Optional playback-only ambient noise (never sent to STT).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-muted/30 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">Enable</div>
                    </div>
                    <Switch
                      checked={bgNoiseEnabled}
                      onCheckedChange={(v) => setBgNoiseEnabled(Boolean(v))}
                      disabled={bgNoiseLocked || configLocked}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-20 text-xs text-muted-foreground">Volume</div>
                    <input
                      className="flex-1"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={bgNoiseVolume}
                      onChange={(e) => setBgNoiseVolume(Number(e.target.value))}
                      disabled={!bgNoiseEnabled || bgNoiseLocked || configLocked}
                    />
                    <div className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {bgNoiseVolume}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-20 text-xs text-muted-foreground">Sound</div>
                    <div className="flex-1 flex items-center gap-2">
                      <Select
                        value={bgNoiseUrl || "__none__"}
                        onValueChange={(v) => {
                          if (configLocked) return;
                          stopPreview("selection_change");
                          setBgNoiseUrl(v === "__none__" ? "" : v);
                        }}
                        disabled={!bgNoiseEnabled || bgNoiseLocked || configLocked}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={bgNoiseOptions.length ? "Select" : "No sounds found"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {bgNoiseOptions.map((o) => (
                            <SelectItem key={o.id} value={o.url}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void togglePreview()}
                        disabled={!bgNoiseEnabled || bgNoiseLocked || configLocked || !bgNoiseUrl}
                      >
                        {previewPlaying ? "Stop" : "Preview"}
                      </Button>
                    </div>
                  </div>

                  {bgNoiseLocked && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Locked during active call.
                    </div>
                  )}

                  {!!bgNoiseManifestError && (
                    <div className="mt-2 text-[11px] text-red-600">
                      Failed to load background sounds: {bgNoiseManifestError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* First Intro Message */}
          <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>First Intro Message</CardTitle>
                    <CardDescription>Spoken when the call starts. Required*.</CardDescription>
                  </div>
                  {!agent?.intro_message?.trim() && (
                    <div className="flex items-center gap-1 text-xs text-destructive shrink-0">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Required</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g. Hi, I'm Mark from Pathburn — the first AI-powered truck dispatcher. How are you today?"
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                  disabled={configLocked}
                />
                <div className="flex justify-end pt-3">
                  <Button onClick={() => saveIntro()} disabled={configLocked || savingIntro || !isIntroDirty || !introMessage.trim()} size="sm">
                    {savingIntro ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Intro
                  </Button>
                </div>
              </CardContent>
          </Card>

          {/* Dialing Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Dialing Data</CardTitle>
              <CardDescription>Link exactly one dialing file to this assistant.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Select
                  value={linkedDialingFileId != null ? String(linkedDialingFileId) : "__none__"}
                  onValueChange={(v) => {
                    if (configLocked) return;
                    setLinkedDialingFileId(v === "__none__" ? null : Number(v));
                  }}
                  disabled={configLocked || dialingFilesLoading}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={dialingFilesLoading ? "Loading…" : "Select dialing file"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {dialingFiles.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.original_filename} ({f.row_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => saveDialingLink()}
                  disabled={configLocked || savingDialingLink || !isDialingLinkDirty}
                  size="sm"
                  className="shrink-0"
                >
                  {savingDialingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Upload files in <Link to="/dialing-data" className="underline">Dialing Data</Link>.
              </div>
            </CardContent>
          </Card>

          {/* Conversation Script — full detail, no blur */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle>Conversation Script</CardTitle>
                <CardDescription>Conversation Script for the agent.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <Textarea
                  id="scriptText"
                  placeholder="Enter conversation script…"
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  className="flex-1 min-h-[200px] resize-none text-sm font-mono leading-relaxed"
                  disabled={configLocked}
                />
                <div className="flex justify-end pt-3">
                  <Button onClick={() => saveAgent()} disabled={configLocked || saving || !isDirty} size="sm">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Script
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Debug Log (collapsible) */}
          <Collapsible>
            <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="flex-row items-center justify-between space-y-0 cursor-pointer py-3">
                    <div className="flex items-center">
                      <ChevronDown className="h-4 w-4 mr-2 transition-transform [&[data-state=open]]:rotate-180" />
                      <div>
                        <CardTitle>Debug Log</CardTitle>
                        <CardDescription>Raw WebSocket events.</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEvents([]); }}>Clear</Button>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="max-h-[300px] overflow-y-auto text-xs font-mono space-y-2 pr-2">
                    <div className="flex items-center justify-between gap-2 pb-2">
                      <label className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={debugMode}
                          onChange={(e) => setDebugMode(e.target.checked)}
                        />
                        Debug mode
                      </label>
                      <div className="text-[11px] text-muted-foreground">
                        {debugMode ? "Enabled" : "Disabled"}
                      </div>
                    </div>
                    {debugTurns.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No debug turns yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {debugTurns.map((t) => (
                          <div key={t.turnId} className="rounded border border-border/60 p-2">
                            <div className="text-[11px] font-semibold text-foreground">Turn {t.turnId}</div>
                            <div className="mt-2 space-y-1">
                              {t.events.map((ev, idx) => (
                                <div key={`${t.turnId}-${idx}`} className="flex items-baseline justify-between gap-3">
                                  <div className="text-primary/80 truncate">{ev.stage}</div>
                                  <div className="text-muted-foreground shrink-0">
                                    {ev.lat && typeof ev.lat.prev === "number" ? `+${ev.lat.prev.toFixed(0)}ms` : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Raw frames (optional) */}
                    <details className="pt-2">
                      <summary className="cursor-pointer text-muted-foreground">Raw events</summary>
                      <div className="mt-2 space-y-2">
                        {debugEvents.map((e) => (
                          <div key={e.ts}>
                            <span className="text-muted-foreground/50">{new Date(e.ts).toLocaleTimeString()}</span>
                            <span className="text-primary/80 ml-2">{e.type}</span>
                            <pre className="text-muted-foreground whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                              {JSON.stringify(e.payload, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </details>
                  </CardContent>
                </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right Column: Conversation (live/testing) */}
        <div className="lg:col-span-1 flex flex-col min-h-0 order-last lg:order-none">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>Live conversation/testing area.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                {chat.length === 0 && (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No conversation yet. Start a call to begin.
                  </div>
                )}
                {chat.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex items-end gap-2 ${turn.speaker === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {turn.speaker === "agent" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        turn.speaker === "user"
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 border border-primary/20"
                      }`}
                    >
                      {turn.text}
                    </div>
                    {turn.speaker === "user" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                        U
                      </div>
                    )}
                  </div>
                ))}

                {partialUserText.trim() && (
                  <div className="flex items-end gap-2 justify-end">
                    <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground">
                      <span className="opacity-80">{partialUserText}</span>
                      <span className="opacity-60"> …</span>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                      U
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call Flow Status Modal — only shown during warmup */}
      <Dialog open={callFlowStatus === "warming" && wsStatus === "connected"}>
        <DialogContent className="sm:max-w-[280px] [&>button]:hidden p-6">
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Warming Up...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

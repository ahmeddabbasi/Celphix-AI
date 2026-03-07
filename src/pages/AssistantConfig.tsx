import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Loader2, Save, Volume2, Pencil, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { api } from "../lib/api";
import { getWsUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { callSession } from "@/lib/callSession";
import { WsSignalHud } from "@/components/WsSignalHud";
import { useQueryClient } from "@tanstack/react-query";

type AgentDetail = {
  id: string;
  display_name?: string;
  script_text?: string;
  speaker_id?: string | null;
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function nowIso() {
  return new Date().toISOString();
}

export default function AssistantConfig() {
  const { id } = useParams();
  const agentId = id ?? "";

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [callStarting, setCallStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [savingVoice, setSavingVoice] = useState(false);
  const [warmingUpVoice, setWarmingUpVoice] = useState(false);
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
      await api.dashboard.renameAssistant(agentId, trimmed);
      setAgent((prev) => prev ? { ...prev, display_name: trimmed } : prev);
      setEditingName(false);
      queryClient.invalidateQueries({ queryKey: ["assistants", "with-stats"] });
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

  async function ensurePlaybackContext(sampleRate: number) {
    if (playbackContextRef.current) return playbackContextRef.current;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    playbackContextRef.current = ctx;
    playbackChainRef.current = { nextTime: ctx.currentTime };
    setSpeakerStatus("primed");
    pushEvent("speaker_ready", { sampleRate: ctx.sampleRate });
    return ctx;
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

  async function playPcm16Chunk(base64Audio: string, sampleRate: number) {
    try {
      const ctx = await ensurePlaybackContext(sampleRate);
      if (ctx.state === "suspended") await ctx.resume();

      const bytes = base64ToBytes(base64Audio);
      const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      const float32 = pcm16ToFloat32(pcm16);
      const buffer = ctx.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
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
      const res = await api.dashboard.getAssistant(encodeURIComponent(agentId));
      const a = res.assistant;
      setAgent({
        id: String(a.assistant_id),
        display_name: a.display_name ?? undefined,
        script_text: a.script_text ?? undefined,
        speaker_id: a.speaker_id ?? null,
      });
      setScriptText(a.script_text ?? "");
      setSelectedVoice(a.speaker_id ?? null);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load agent";
      setError(msg);
      toast({ variant: "destructive", title: "Agent", description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function saveAgent() {
    if (!agentId) return;
    setSaving(true);
    try {
      const res = await api.dashboard.updateAssistant(encodeURIComponent(agentId), {
        script_text: scriptText,
      });
      const a = res.assistant;
      setAgent({
        id: String(a.assistant_id),
        display_name: a.display_name ?? undefined,
        script_text: a.script_text ?? undefined,
        speaker_id: a.speaker_id ?? null,
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
    setSavingVoice(true);
    try {
      const res = await api.dashboard.updateAssistantVoice(
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
        api.dashboard
          .warmupAssistantVoice(encodeURIComponent(agentId), speakerToWarm)
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
    setCallStarting(true);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("No access token. Please log in again.");

      // Operator flow: ask backend to create a fresh session for this agent, owned by current operator.
      const created = await api.post<{ session_id: string; agent_id: string }>(
        `/operator/agents/${encodeURIComponent(agentId)}/session`
      );
      sessionIdRef.current = created.session_id;
      pushEvent("session_created", created);

      const wsUrl = getWsUrl().replace(/\/$/, "");

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
            void playPcm16Chunk(parsed.audio, sr);
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
                // Move to cleanup status
                setCallFlowStatus("cleanup");
                
                // NOTE: We do NOT stop mic streaming here - keep it running for auto-next-call.
                // The mic will only stop when the WebSocket closes (ws.onclose).
                // await stopMicStreaming();
                
                await cleanupPlayback();
                // Prime playback context to reduce first-audio latency on the next call.
                try {
                  await ensurePlaybackContext(22050);
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
          <Link to="/assistants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assistants
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-4 sm:p-6 h-full flex flex-col">
      {/* ── Header: Back + Name (left) | Start Call (right, same row) ── */}
      <motion.div variants={item} className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
            <Link to="/assistants">
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
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{agent?.display_name ?? agentId}</h1>
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
              disabled={callStarting || wsStatus === "connecting"}
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
      </motion.div>

      {/* Reconnecting banner — shown while WS is reconnecting */}
      {(wsStatus === "reconnecting" || wsStatus === "connecting") && (
        <motion.div
          key="reconnect-banner"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mb-3 flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent-foreground"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
          {wsStatus === "reconnecting" ? "Re-establishing connection…" : "Connecting…"}
        </motion.div>
      )}

      {/* Current customer banner (visible during call) */}
      {wsStatus === "connected" && currentCustomer && (
        <motion.div variants={item} className="mb-3 rounded-md border border-border bg-muted/50 p-3 text-sm">
          <p className="font-semibold text-foreground">
            {typeof currentCustomer.index !== "undefined" && currentCustomer.index !== null
              ? `Customer #${String(currentCustomer.index)}`
              : "Customer"}
            {currentCustomer.name?.trim() ? ` — ${currentCustomer.name}` : ""}
          </p>
          {currentCustomer.number?.trim() ? (
            <p className="text-muted-foreground">{currentCustomer.number}</p>
          ) : null}
        </motion.div>
      )}

      {/* ── Main Content Area (2 columns) ── */}
      <div className="flex-1 grid md:grid-cols-3 gap-4 min-h-0">
        {/* Left Column: Conversation (2/3 width) */}
        <motion.div variants={item} className="md:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
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
        </motion.div>

        {/* Right Column: Voice Selection + Conversation Script + Debug */}
        <div className="md:col-span-1 flex flex-col gap-4 min-h-0">
          {/* Voice Selection */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Voice
                </CardTitle>
                <CardDescription>Select the TTS voice for this assistant.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedVoice ?? "__default__"}
                    onValueChange={(v) => setSelectedVoice(v === "__default__" ? null : v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="System default (p226)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">System default (p226)</SelectItem>
                      {voices?.map((v) => (
                        <SelectItem key={v.speaker_id} value={v.speaker_id}>
                          {v.display_name} — {v.accent} ({v.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => saveVoice()}
                    disabled={savingVoice || !isVoiceDirty}
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
          </motion.div>

          {/* Conversation Script — full detail, no blur */}
          <motion.div variants={item} className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle>Conversation Script</CardTitle>
                <CardDescription>Edit the agent's conversation script.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <Textarea
                  id="scriptText"
                  placeholder="Enter conversation script…"
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  className="flex-1 min-h-[200px] resize-none text-sm font-mono leading-relaxed"
                />
                <div className="flex justify-end pt-3">
                  <Button onClick={() => saveAgent()} disabled={saving || !isDirty} size="sm">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Script
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Debug Log (collapsible) */}
          <motion.div variants={item}>
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
          </motion.div>
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
    </motion.div>
  );
}

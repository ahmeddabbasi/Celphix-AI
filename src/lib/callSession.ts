type CallFlowStatus = "idle" | "warming" | "ready" | "calling" | "ending" | "cleanup";

type WsStatus = "disconnected" | "connecting" | "connected" | "error";

type MicStatus = "idle" | "starting" | "streaming" | "error";

type SpeakerStatus = "idle" | "playing";

export type CallCustomer = {
  index?: string | number;
  name?: string;
  number?: string;
};

export type CallEvent = { ts: number; type: string; payload?: any };

export type TranscriptUpdate = {
  kind: "partial" | "final";
  text: string;
  confidence?: number;
};

export type CallSessionSnapshot = {
  agentId: string | null;
  sessionId: string | null;
  wsStatus: WsStatus;
  micStatus: MicStatus;
  speakerStatus: SpeakerStatus;
  callFlowStatus: CallFlowStatus;
  currentCustomer: CallCustomer | null;
  partialUserText: string;
  // Full on-screen conversation timeline (user + agent). This is persisted
  // across navigation so returning to the agent page shows the full history.
  chat: Array<{ id: string; ts: number; speaker: "user" | "agent"; text: string }>;
  events: CallEvent[];
};

type Listener = () => void;

function now() {
  return Date.now();
}

class CallSessionSingleton {
  private listeners = new Set<Listener>();

  // Connection/session identity
  agentId: string | null = null;
  sessionId: string | null = null;

  // Status
  wsStatus: WsStatus = "disconnected";
  micStatus: MicStatus = "idle";
  speakerStatus: SpeakerStatus = "idle";
  callFlowStatus: CallFlowStatus = "idle";

  // UI data
  currentCustomer: CallCustomer | null = null;
  partialUserText = "";
  chat: Array<{ id: string; ts: number; speaker: "user" | "agent"; text: string }> = [];
  events: CallEvent[] = [];

  // Owning resources
  ws: WebSocket | null = null;

  // Owned by AssistantConfig. Only it should set/clear this.
  private micStartFn: (() => Promise<void>) | null = null;
  private micStopFn: (() => Promise<void>) | null = null;

  // Allow AssistantConfig to register functions that actually talk to the mic.
  setMicFns(start: (() => Promise<void>) | null, stop: (() => Promise<void>) | null) {
    this.micStartFn = start;
    this.micStopFn = stop;
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit() {
    for (const cb of this.listeners) cb();
  }

  snapshot(): CallSessionSnapshot {
    return {
      agentId: this.agentId,
      sessionId: this.sessionId,
      wsStatus: this.wsStatus,
      micStatus: this.micStatus,
      speakerStatus: this.speakerStatus,
      callFlowStatus: this.callFlowStatus,
      currentCustomer: this.currentCustomer,
      partialUserText: this.partialUserText,
      chat: this.chat,
      events: this.events,
    };
  }

  pushChatTurn(speaker: "user" | "agent", text: string, ts: number = now()) {
    const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    const id = `${ts}-${Math.random().toString(16).slice(2)}`;
    this.chat = [...this.chat, { id, ts, speaker, text: cleaned }].slice(-400);
    this.emit();
  }

  appendAgentText(text: string, ts: number = now()) {
    const chunk = (text ?? "").replace(/\s+/g, " ");
    if (!chunk.trim()) return;
    const last = this.chat[this.chat.length - 1];
    if (last && last.speaker === "agent") {
      this.chat = [
        ...this.chat.slice(0, -1),
        { ...last, text: (last.text + chunk).replace(/\s+/g, " ").trim(), ts },
      ];
      this.emit();
      return;
    }
    this.pushChatTurn("agent", chunk, ts);
  }

  clearChat() {
    this.chat = [];
    this.emit();
  }

  pushEvent(type: string, payload?: any) {
    this.events = [{ ts: now(), type, payload }, ...this.events].slice(0, 500);
    this.emit();
  }

  setPartialUserText(t: string) {
    this.partialUserText = t;
    this.emit();
  }

  setWsStatus(s: WsStatus) {
    this.wsStatus = s;
    this.emit();
  }

  setMicStatus(s: MicStatus) {
    this.micStatus = s;
    this.emit();
  }

  setCallFlowStatus(s: CallFlowStatus) {
    this.callFlowStatus = s;
    this.emit();
  }

  setCurrentCustomer(c: CallCustomer | null) {
    this.currentCustomer = c;
    this.emit();
  }

  // AssistantConfig calls this to attach a freshly-created (still CONNECTING) WS to this
  // singleton.  All ws.on* handlers are set HERE so there is exactly one place that owns
  // them; AssistantConfig must NOT set ws.onopen/onerror/onclose/onmessage itself.
  //
  // onOpenExtra: optional callback to run after the standard onopen work (send start_call
  //   + start mic).  Keeps the contract explicit without duplicating logic.
  attachWs(
    ws: WebSocket,
    meta: { agentId: string; sessionId: string },
    onOpenExtra?: (ws: WebSocket) => void,
  ) {
    // Only keep one connection.
    if (this.ws && this.ws !== ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }

    this.ws = ws;
    this.agentId = meta.agentId;
    this.sessionId = meta.sessionId;
    this.setWsStatus("connecting");

    ws.onopen = () => {
      this.setWsStatus("connected");
      this.pushEvent("ws_open", {});
      // Send start_call + start mic via the caller-provided hook.
      onOpenExtra?.(ws);
    };

    ws.onerror = () => {
      this.setWsStatus("error");
      this.pushEvent("ws_error", {});
    };

    ws.onclose = () => {
      this.setWsStatus("disconnected");
      this.pushEvent("ws_close", {});
      // If the WS closes for any reason, mic should stop.
      // (AssistantConfig is the only place that wires micStopFn.)
      this.micStopFn?.().catch(() => {
        /* ignore */
      });
      this.setCurrentCustomer(null);
      this.setPartialUserText("");
    };

    // NOTE: ws.onmessage is NOT set here. AssistantConfig owns the full message
    // handler (it handles TTS playback, chat transcripts, etc.) and must call
    // callSession.handleMessage(parsed) for the events this singleton cares about.

    this.emit();
  }

  // Called by AssistantConfig from within its own ws.onmessage handler.
  // Keeps singleton state (callFlowStatus, customer, partials) in sync.
  handleMessage(parsed: any) {
    try {
      if (parsed?.type) {
        this.pushEvent("ws_message", { type: parsed.type, payload: parsed });
      } else {
        this.pushEvent("ws_message", { type: "(missing)", payload: parsed });
      }

      if (parsed?.type === "connection_ready") {
        this.setCallFlowStatus("idle");
      }

      if (parsed?.type === "call_started") {
        // Dismiss warming overlay — call is live.
        this.setCallFlowStatus("idle");
      }

      if (parsed?.type === "start_call") {
        this.setCallFlowStatus("warming");
      }

      if (parsed?.type === "calling_index_assigned") {
        this.setCallFlowStatus("ready");
        const index = parsed?.index ?? parsed?.customer_index;
        const name = parsed?.name ?? parsed?.customer_name ?? parsed?.customerName;
        const number = parsed?.phone_number ?? parsed?.phone ?? parsed?.number;
        this.setCurrentCustomer({
          index,
          name: typeof name === "string" ? name : undefined,
          number: typeof number === "string" ? number : undefined,
        });
      }

      if (parsed?.type === "partial_transcription") {
        const t = parsed?.text ?? parsed?.transcript ?? parsed?.data?.text ?? "";
        if (typeof t === "string") {
          const cleaned = t.replace(/\s+/g, " ").trim();
          this.setPartialUserText(cleaned);
        }
      }

      if (parsed?.type === "transcription") {
        this.setPartialUserText("");
      }

      if (parsed?.type === "debug_event") {
        this.pushEvent("debug_event", parsed);
      }

      if (parsed?.type === "stt_status") {
        this.pushEvent("stt_status", parsed);
      }

      if (parsed?.type === "call_ended") {
        this.pushEvent("call_ended", parsed);
        this.setCallFlowStatus("ending");
        this.setCurrentCustomer(null);
        this.setPartialUserText("");
        this.setCallFlowStatus("cleanup");
        setTimeout(() => {
          if (this.callFlowStatus === "cleanup") this.setCallFlowStatus("idle");
        }, 1000);
      }

      if (parsed?.type === "auto_start_next_call" || parsed?.type === "auto_start_first_call") {
        this.setCallFlowStatus("warming");
        this.setCurrentCustomer({
          index: parsed?.customer_index ?? parsed?.index ?? parsed?.customerIndex,
        });
        this.setPartialUserText("");
      }
    } catch {
      // ignore
    }
  }

  // This should only be called from AssistantConfig's Stop Call button.
  stopCall() {
    // Close WS first — this triggers ws.onclose which also calls micStopFn.
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    this.agentId = null;
    this.sessionId = null;

    // Explicitly stop mic too (ws.onclose may not fire synchronously).
    this.micStopFn?.().catch(() => {
      /* ignore */
    });

    // ── Instant full reset ──────────────────────────────────────────────────
    // Wipe every piece of per-call state so the UI is clean the moment the
    // button is pressed.  AssistantConfig's syncFromGlobal subscriber will
    // pick these up in the same tick and clear all local React state.
    this.wsStatus = "disconnected";
    this.micStatus = "idle";
    this.speakerStatus = "idle";
    this.callFlowStatus = "idle";
    this.currentCustomer = null;
    this.partialUserText = "";
    this.chat = [];
    this.events = [];
    // Single emit so all subscribers re-render once.
    this.emit();
  }

  // Helper for AssistantConfig to start mic once WS is open.
  async startMicIfPossible() {
    if (!this.micStartFn) return;
    await this.micStartFn();
  }
}

export const callSession = new CallSessionSingleton();

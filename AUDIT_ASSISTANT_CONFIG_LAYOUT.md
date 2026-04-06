# Assistant Config Audit (pre-change)

File: `src/pages/AssistantConfig.tsx`

## Page header (currently at top of page)

- Back navigation button (to `/assistants` or `/payg/assistants` depending on route)
- Assistant name (editable inline) + agentId (monospace)
- Primary page action: `Start Call` / `Stop Call`
- Connection HUD (WS status / mic status / speaker status) on `sm+`

## Additional always-present / conditional sections (below header)

- Reconnecting banner: visible when `wsStatus` is `connecting` or `reconnecting`
- Current customer banner: visible during call when `wsStatus === connected` and `currentCustomer` is set

## Main content layout (currently)

- Two-column layout at `lg+` via `grid lg:grid-cols-3`:
  - Left column (`lg:col-span-2`): configuration cards and forms
    - Voice settings card
    - Background noise settings card
    - Intro message section
    - Conversation script section (save button)
    - Dialing link section (select + save)
  - Right column (`lg:col-span-1`): conversation / test call UI (chat / events)

## State variables (local to AssistantConfig)

- Loading/saving: `loading`, `saving`, `callStarting`, `error`
- Agent config: `agent`, `scriptText`, `introMessage`, `selectedVoice`, `savingVoice`, `warmingUpVoice`, `savingIntro`
- Dialing link: `dialingFiles`, `dialingFilesLoading`, `linkedDialingFileId`, `savingDialingLink`
- Header name edit: `editingName`, `draftName`, `savingName`
- Call/test UI: `debugMode`, `events`, `chat`, `partialUserText`
- Connection state: `wsStatus`, `micStatus`, `speakerStatus`, `sttStatus`, `callFlowStatus`
- Background noise (playback): `bgNoiseEnabled`, `bgNoiseVolume`, `bgNoiseUrl`, `bgNoiseOptions`, `bgNoiseManifestError`, `previewPlaying`, `bgNoiseLocked`

## Key refs (local)

- `bgNoiseAssistantHydratedRef`, `bgNoiseAssistantSaveTimerRef`
- Playback: `playbackContextRef`, `playbackChainRef`, `playbackNodesRef`
- Call epoch: `callEpochRef`

## Notable handlers / bindings (high-level)

- Assistant rename: inline input + `commitNameEdit()` / `cancelNameEdit()`
- Start/stop call: `startCalling()` / `handleStopCall()`
- Save script / intro / voice / dialing link: multiple save handlers calling `surfaceApi.dashboard.*`
- WebSocket message handling is owned by AssistantConfig (maintains chat/events state)

## Critical behaviors to preserve

- WebSocket + mic + playback state must persist during UI restructuring.
- No state should be re-scoped into newly introduced tab content.
- No API calls should be introduced on tab switching.

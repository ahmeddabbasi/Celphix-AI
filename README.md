# Sales Agent Frontend

React/Vite operator UI for the Sales Agent platform.

## Development

### Install

```sh
npm install
```

### Run

```sh
npm run dev
```

The dev server defaults to port **8080** (see `vite.config.ts`).

## Configuration

Configure endpoints via Vite env vars:

- `VITE_API_URL` (default: `http://localhost:8000`)
- `VITE_WS_URL` (default: `ws://localhost:8000`)

## What this UI includes

- Assistants list and configuration (script + sheet)
- Start/Stop calling sessions
- Live call monitoring over WebSocket
- Mic streaming + streamed PCM playback

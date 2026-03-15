# Background Noise Assets

Place your MP3 files in this directory and list them in `manifest.json`.

Current files in this repo are:

- `office-6.mp3`
- `office-3.mp3`
- `office-4.mp3`
- `office-2.mp3`
- `office-5.mp3`

## Requirements

- Format: MP3 (recommended) or any format the Web Audio API can decode (WAV, OGG)
- Ensure `manifest.json` references the exact filenames
- Drop files into this directory — Vite serves them automatically at `/bg-noise/<filename>`
- Looped playback — single continuous loop is fine; no special preparation needed

## Testing

Use the Preview (▶) button next to the sound dropdown in the Assistant Configuration
page to verify each file plays correctly before going live.

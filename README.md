# Voice Spark

Build a mobile-first web app called 1Minute Bot based on the attached build prompt.

Tagline: Your Voice. Brought to Life.
Core message: You bring the voice. AI brings it to life.

1. MCP Integration:
- Plunder & Riffle MCP endpoint: https://bot.plunderandriffle.com/api/mcp
- Call tools via JSON-RPC / SSE over HTTP (e.g. `create_audioscript` accepting direct base64 audio with `render_mp4: true`, or `create_one_minute` / `create_video_pack` with audio URL / polling).
- Handle job creation, polling (`get_audioscript_status`, `get_mp4_status`, `get_one_minute_status`), progress display, and media URLs.
- Include secure API key configuration/storage so requests authenticate with Bearer tokens without exposing keys to the browser.

2. Main Screen:
- Dark, premium, mobile-first design where the audio recorder is the hero of the entire page.
- Option A: In-browser audio recording (microphone capture up to 60s, live waveform visualizer, elapsed timer, pause/resume, review/playback, and discard).
- Option B: MP3 audio file upload / drag-and-drop zone with duration validation and playback preview.
- One prominent primary CTA: "BRING IT TO LIFE" (disabled until valid audio is ready).

3. Processing State:
- Status display ("Your voice is becoming something bigger") cycling through meaningful stages tied to backend job progress.

4. Results Screen:
- Large, beveled smartphone-style preview displaying the finished video with playback controls.
- Clear Download button and Share Link button for the returned media URL.
- Quick actions to create variants or start over with new audio.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9b05e39d-2d48-48ee-a094-349c47046ea9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

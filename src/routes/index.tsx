import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Trash2, Upload, Download, Share2, RefreshCw, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startGeneration, getGenerationStatus } from "@/lib/pr.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "1Minute Bot — Your Voice. Brought to Life." },
      { name: "description", content: "Record up to 60 seconds or upload an MP3. AI turns your voice into a shareable video." },
      { property: "og:title", content: "1Minute Bot — Your Voice. Brought to Life." },
      { property: "og:description", content: "You bring the voice. AI brings it to life." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MAX_SECONDS = 60;
const MAX_BYTES = 24 * 1024 * 1024;
const JOB_KEY = "1mb-active-job";
const STAGES = [
  "Listening to your audio.",
  "Finding the story.",
  "Bringing your idea to life.",
  "Creating your content.",
  "Getting your creation ready to share.",
];

type Audio = { blob: Blob; url: string; name: string; duration: number };
type Result = { mp4Url: string | null; pageUrl: string | null };
type Phase = "input" | "processing" | "result";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}

function getDuration(url: string): Promise<number> {
  return new Promise((res, rej) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      if (a.duration === Infinity) {
        a.currentTime = 1e7;
        a.ontimeupdate = () => { a.ontimeupdate = null; res(a.duration); };
      } else res(a.duration);
    };
    a.onerror = () => rej(new Error("Could not read audio"));
    a.src = url;
  });
}

function Index() {
  const [phase, setPhase] = useState<Phase>("input");
  const [audio, setAudio] = useState<Audio | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const start = useServerFn(startGeneration);

  useEffect(() => {
    const saved = localStorage.getItem(JOB_KEY);
    if (saved) { setJobId(saved); setPhase("processing"); }
  }, []);

  const submit = async () => {
    if (!audio) return;
    setPhase("processing");
    try {
      const b64 = await blobToBase64(audio.blob);
      const { jobId } = await start({ data: { audioBase64: b64, title: audio.name } });
      localStorage.setItem(JOB_KEY, jobId);
      setJobId(jobId);
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong. Your audio is still here.");
      setPhase("input");
    }
  };

  const done = (r: Result) => { localStorage.removeItem(JOB_KEY); setResult(r); setPhase("result"); };
  const failed = (msg: string) => {
    localStorage.removeItem(JOB_KEY); setJobId(null);
    toast.error(msg + " Your audio is still here — try again.");
    setPhase("input");
  };
  const reset = () => { setAudio(null); setResult(null); setJobId(null); setPhase("input"); };
  const variant = () => { setResult(null); setJobId(null); if (audio) submit(); else setPhase("input"); };

  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      <div className="pointer-events-none fixed inset-0 opacity-40" style={{ background: "radial-gradient(60% 40% at 50% 0%, color-mix(in oklab, var(--glow) 25%, transparent), transparent)" }} />
      <div className="relative mx-auto flex max-w-md flex-col px-5 pb-16 pt-10">
        <header className="text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">1Minute <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-voice)" }}>Bot</span></h1>
          <p className="mt-2 font-display text-lg text-glow">Your Voice. Brought to Life.</p>
          {phase === "input" && (
            <>
              <p className="mt-4 text-sm font-semibold">You bring the voice. AI brings it to life.</p>
              <p className="mt-2 text-sm text-muted-foreground">Record a thought, share a story, drop a rant, or upload an MP3. We'll turn your audio into content people can watch, hear, share, and remember.</p>
            </>
          )}
        </header>

        {phase === "input" && <InputStage audio={audio} setAudio={setAudio} onSubmit={submit} />}
        {phase === "processing" && <Processing jobId={jobId} onDone={done} onFail={failed} />}
        {phase === "result" && result && <Results result={result} onVariant={variant} onReset={reset} canVariant={!!audio} />}
      </div>
    </main>
  );
}

function InputStage({ audio, setAudio, onSubmit }: { audio: Audio | null; setAudio: (a: Audio | null) => void; onSubmit: () => void }) {
  return (
    <section className="mt-8 flex flex-col gap-5">
      {audio ? <Review audio={audio} onDiscard={() => { URL.revokeObjectURL(audio.url); setAudio(null); }} /> : (
        <>
          <Recorder onDone={setAudio} />
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Uploader onDone={setAudio} />
        </>
      )}
      <button
        disabled={!audio}
        onClick={onSubmit}
        className="mt-2 flex h-16 items-center justify-center gap-2 rounded-2xl font-display text-lg font-extrabold tracking-wider text-primary-foreground transition disabled:opacity-30 enabled:hover:scale-[1.02]"
        style={{ backgroundImage: "var(--gradient-voice)", boxShadow: audio ? "var(--shadow-glow)" : undefined }}
      >
        <Sparkles className="h-5 w-5" /> BRING IT TO LIFE
      </button>
    </section>
  );
}

function Recorder({ onDone }: { onDone: (a: Audio) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
  const [elapsed, setElapsed] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const raf = useRef(0);
  const timer = useRef<number>(0);
  const elapsedRef = useRef(0);

  const draw = useCallback(() => {
    const c = canvasRef.current, a = analyser.current;
    if (!c || !a) return;
    const ctx = c.getContext("2d")!;
    const data = new Uint8Array(a.frequencyBinCount);
    a.getByteTimeDomainData(data);
    ctx.clearRect(0, 0, c.width, c.height);
    const bars = 48, w = c.width / bars;
    const color = getComputedStyle(c).color;
    ctx.fillStyle = color;
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(data[Math.floor((i / bars) * data.length)] - 128) / 128;
      const h = Math.max(4, v * c.height * 1.6);
      ctx.fillRect(i * w + 2, (c.height - h) / 2, w - 4, h);
    }
    raf.current = requestAnimationFrame(draw);
  }, []);

  const stop = useCallback(() => {
    rec.current?.state !== "inactive" && rec.current?.stop();
  }, []);

  const begin = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const ac = new AudioContext();
      const an = ac.createAnalyser(); an.fftSize = 1024;
      ac.createMediaStreamSource(s).connect(an);
      analyser.current = an;
      const mr = new MediaRecorder(s);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        cancelAnimationFrame(raf.current); clearInterval(timer.current);
        s.getTracks().forEach((t) => t.stop()); ac.close();
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        onDone({ blob, url: URL.createObjectURL(blob), name: "My recording", duration: elapsedRef.current });
        setState("idle");
      };
      mr.start(250);
      rec.current = mr;
      elapsedRef.current = 0; setElapsed(0);
      timer.current = window.setInterval(() => {
        if (mr.state !== "recording") return;
        elapsedRef.current += 0.1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_SECONDS) mr.stop();
      }, 100);
      setState("recording");
      draw();
    } catch {
      toast.error("We need microphone access to record. You can upload an MP3 instead.");
    }
  };

  useEffect(() => () => { cancelAnimationFrame(raf.current); clearInterval(timer.current); stream.current?.getTracks().forEach((t) => t.stop()); }, []);

  const pct = Math.min(1, elapsed / MAX_SECONDS);
  return (
    <div className="rounded-3xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--bevel)" }}>
      <canvas ref={canvasRef} width={480} height={90} className={`h-20 w-full text-glow ${state === "idle" ? "opacity-0" : ""}`} />
      <div className="font-display text-4xl font-bold tabular-nums">{fmt(elapsed)}<span className="text-base text-muted-foreground"> / 1:00</span></div>
      <div className="mx-auto mt-3 h-1 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct * 100}%` }} /></div>
      <div className="mt-6 flex items-center justify-center gap-5">
        {state === "idle" ? (
          <button onClick={begin} aria-label="Start recording" className="relative flex h-28 w-28 items-center justify-center rounded-full text-primary-foreground transition hover:scale-105" style={{ backgroundImage: "var(--gradient-voice)", boxShadow: "var(--shadow-glow)" }}>
            <Mic className="h-12 w-12" />
          </button>
        ) : (
          <>
            <button aria-label={state === "paused" ? "Resume" : "Pause"} onClick={() => {
              if (state === "recording") { rec.current?.pause(); setState("paused"); }
              else { rec.current?.resume(); setState("recording"); }
            }} className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted">
              {state === "paused" ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
            </button>
            <button aria-label="Stop recording" onClick={stop} className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-ember text-foreground">
              <Square className="h-9 w-9 fill-current" />
            </button>
          </>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{state === "idle" ? "Tap to record up to 60 seconds" : state === "paused" ? "Paused" : "Recording…"}</p>
    </div>
  );
}

function Uploader({ onDone }: { onDone: (a: Audio) => void }) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const handle = async (f?: File) => {
    if (!f) return;
    if (!/\.mp3$/i.test(f.name) && f.type !== "audio/mpeg") return toast.error("Please choose an MP3 file.");
    if (f.size > MAX_BYTES) return toast.error("That file is over 24 MB.");
    const url = URL.createObjectURL(f);
    try {
      const d = await getDuration(url);
      if (d > MAX_SECONDS + 0.5) { URL.revokeObjectURL(url); return toast.error(`That's ${fmt(d)} long — keep it to 60 seconds.`); }
      onDone({ blob: f, url, name: f.name.replace(/\.mp3$/i, ""), duration: d });
    } catch { URL.revokeObjectURL(url); toast.error("We couldn't read that audio file."); }
  };
  return (
    <button
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      className={`flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition ${drag ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"}`}
    >
      <Upload className="h-6 w-6 text-glow" />
      <span className="text-left"><span className="block font-semibold">Upload an MP3</span><span className="text-xs text-muted-foreground">Tap or drop a file · up to 60 seconds</span></span>
      <input ref={input} type="file" accept="audio/mpeg,.mp3" className="hidden" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
    </button>
  );
}

function Review({ audio, onDiscard }: { audio: Audio; onDiscard: () => void }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6" style={{ boxShadow: "var(--bevel)" }}>
      <div className="flex items-center justify-between">
        <div><p className="font-semibold">{audio.name}</p><p className="text-sm text-muted-foreground">{fmt(audio.duration)} · ready</p></div>
        <button onClick={onDiscard} aria-label="Discard audio" className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /> Discard</button>
      </div>
      <audio controls src={audio.url} className="mt-4 w-full" />
    </div>
  );
}

function Processing({ jobId, onDone, onFail }: { jobId: string | null; onDone: (r: Result) => void; onFail: (m: string) => void }) {
  const poll = useServerFn(getGenerationStatus);
  const [progress, setProgress] = useState<number | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const cb = useRef({ onDone, onFail });
  cb.current = { onDone, onFail };

  useEffect(() => {
    if (!jobId) return;
    let alive = true, errors = 0;
    const tick = async () => {
      try {
        const s = await poll({ data: { jobId } });
        errors = 0;
        if (!alive) return;
        if (s.progress != null) setProgress(s.progress);
        if (s.step) setStep(s.step);
        if (s.status === "failed" || s.status === "error") return cb.current.onFail(s.error || "Generation failed.");
        if (s.status === "done" && !s.mp4Pending) return cb.current.onDone({ mp4Url: s.mp4Url, pageUrl: s.pageUrl });
      } catch (e) {
        if (++errors > 5) return cb.current.onFail((e as Error).message);
      }
      if (alive) setTimeout(tick, 4000);
    };
    tick();
    return () => { alive = false; };
  }, [jobId, poll]);

  // Stage tied to real progress when available; before a job exists, stay on stage 0.
  useEffect(() => {
    if (progress != null) setStage(Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length)));
  }, [progress]);

  return (
    <section className="mt-12 flex flex-col items-center text-center">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="absolute inset-4 animate-pulse rounded-full" style={{ backgroundImage: "var(--gradient-voice)", boxShadow: "var(--shadow-glow)" }} />
        <Loader2 className="relative h-12 w-12 animate-spin text-primary-foreground" />
      </div>
      <h2 className="mt-10 font-display text-2xl font-bold">Your voice is becoming something bigger.</h2>
      <p className="mt-3 min-h-6 text-glow">{jobId ? (step ? `${step[0].toUpperCase()}${step.slice(1)}` : STAGES[stage]) : "Sending your audio…"}</p>
      {progress != null && (
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full transition-all" style={{ width: `${progress}%`, backgroundImage: "var(--gradient-voice)" }} /></div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">This usually takes a few minutes. You can leave and come back — we'll pick up where you left off.</p>
    </section>
  );
}

function Results({ result, onVariant, onReset, canVariant }: { result: Result; onVariant: () => void; onReset: () => void; canVariant: boolean }) {
  const shareUrl = result.pageUrl ?? result.mp4Url;
  const share = async () => {
    if (!shareUrl) return;
    if (navigator.share) { try { await navigator.share({ title: "Made with 1Minute Bot", url: shareUrl }); return; } catch { /* fallthrough */ } }
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  };
  return (
    <section className="mt-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-[300px] rounded-[2.75rem] border border-border bg-card p-3" style={{ boxShadow: "var(--bevel), var(--shadow-glow)" }}>
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-background" />
        <div className="aspect-[9/16] overflow-hidden rounded-[2rem] bg-background">
          {result.mp4Url ? <video src={result.mp4Url} controls playsInline autoPlay className="h-full w-full object-cover" />
            : result.pageUrl ? <iframe src={result.pageUrl} title="Your creation" className="h-full w-full" />
            : <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">No media was returned.</div>}
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        {result.mp4Url ? (
          <a href={result.mp4Url} download target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl font-bold text-primary-foreground" style={{ backgroundImage: "var(--gradient-voice)" }}><Download className="h-5 w-5" /> Download</a>
        ) : <span />}
        <button onClick={share} disabled={!shareUrl} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-card font-bold disabled:opacity-40"><Share2 className="h-5 w-5" /> Share link</button>
      </div>
      {shareUrl && <p className="w-full truncate text-center text-xs text-muted-foreground">{shareUrl}</p>}
      <div className="flex w-full gap-3">
        <button onClick={onVariant} disabled={!canVariant} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"><RefreshCw className="h-4 w-4" /> Make another version</button>
        <button onClick={onReset} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground"><RotateCcw className="h-4 w-4" /> Start over</button>
      </div>
    </section>
  );
}

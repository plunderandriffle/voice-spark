import { createServerFn } from "@tanstack/react-start";

const ENDPOINT = "https://bot.plunderandriffle.com/api/mcp";

async function callTool(name: string, args: Record<string, unknown>) {
  const key = process.env["PR_API_KEY"];
  if (!key) throw new Error("The Plunder & Riffle API key is not configured yet.");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
  });
  let text = await res.text();
  // SSE transport: take the last data: line
  if (text.trimStart().startsWith("event:") || text.includes("\ndata:") || text.startsWith("data:")) {
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));
    text = lines.length ? lines[lines.length - 1].slice(5).trim() : text;
  }
  let msg: any;
  try {
    msg = JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response from generator (${res.status}).`);
  }
  if (msg.error) throw new Error(msg.error.message ?? "Generator error");
  const result = msg.result ?? {};
  const contentText: string = (result.content ?? []).map((c: any) => c.text ?? "").join("\n");
  let data: any = result.structuredContent;
  if (!data) {
    try {
      data = JSON.parse(contentText);
    } catch {
      data = { message: contentText };
    }
  }
  if (result.isError) throw new Error(data?.error ?? data?.message ?? contentText ?? "Generation failed");
  return data as Record<string, any>;
}

function pickJobId(d: any): string | undefined {
  return d?.jobId ?? d?.job_id ?? d?.id ?? d?.job?.id;
}

export const startGeneration = createServerFn({ method: "POST" })
  .inputValidator((input: { audioBase64: string; title?: string }) => {
    if (typeof input?.audioBase64 !== "string" || input.audioBase64.length < 100) throw new Error("Missing audio");
    if (input.audioBase64.length > 33_000_000) throw new Error("Audio is too large");
    return input;
  })
  .handler(async ({ data }) => {
    const out = await callTool("create_audioscript", {
      audio_base64: data.audioBase64,
      title: data.title?.slice(0, 120) || "1Minute Bot",
      render_mp4: true,
    });
    const jobId = pickJobId(out);
    if (!jobId) throw new Error(out?.message ?? "The generator did not return a job.");
    return { jobId: String(jobId) };
  });

export const getGenerationStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { jobId: string }) => {
    if (typeof input?.jobId !== "string" || !input.jobId || input.jobId.length > 200) throw new Error("Bad job id");
    return input;
  })
  .handler(async ({ data }) => {
    const d = await callTool("get_audioscript_status", { jobId: data.jobId });
    const status = String(d.status ?? d.state ?? "rendering").toLowerCase();
    const progressRaw = d.progress ?? d.percent;
    const progress = typeof progressRaw === "number" ? (progressRaw <= 1 ? progressRaw * 100 : progressRaw) : null;
    const mp4Url = d.mp4Url ?? d.mp4_url ?? d.videoUrl ?? d.result?.mp4Url ?? null;
    const pageUrl = d.pageUrl ?? d.page_url ?? d.result?.pageUrl ?? null;
    const mp4Pending = status === "done" && !mp4Url && (d.mp4Status ?? d.mp4_status) !== "failed";
    return {
      status: status as string,
      step: (d.step ?? d.stage ?? null) as string | null,
      progress: progress as number | null,
      mp4Url: (mp4Url ?? null) as string | null,
      pageUrl: (pageUrl ?? null) as string | null,
      mp4Pending,
      error: (d.error ?? (status === "failed" ? d.message : null) ?? null) as string | null,
    };
  });

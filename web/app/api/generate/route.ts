import { NextRequest, NextResponse } from "next/server";

const MOCK_RENDER      = process.env.MOCK_RENDER === "true";
const MOCK_DELAY_MS    = 8_000; // time before mock job reports COMPLETED

export async function POST(req: NextRequest) {
  const { photo_url, audio_url } = await req.json() as { photo_url: string; audio_url: string };

  if (!photo_url || !audio_url) {
    return NextResponse.json({ error: "photo_url and audio_url required" }, { status: 400 });
  }

  if (MOCK_RENDER) {
    // Encode creation time in jobId — status route resolves it without any DB
    const jobId = `mock_${Date.now()}`;
    return NextResponse.json({ jobId, mock: true });
  }

  // Real RunPod path — only imported when needed so build doesn't fail without keys
  try {
    const { submitJob } = await import("@/lib/runpod");
    const jobId = await submitJob(photo_url, audio_url);
    return NextResponse.json({ jobId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export { MOCK_DELAY_MS };

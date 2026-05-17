import { NextRequest, NextResponse } from "next/server";

const MOCK_DELAY_MS  = 8_000;
const MOCK_VIDEO_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function resolveMockJob(jobId: string) {
  const ts      = parseInt(jobId.replace("mock_", ""), 10);
  const elapsed = Date.now() - ts;

  if (elapsed >= MOCK_DELAY_MS) {
    return { status: "completed", video_url: MOCK_VIDEO_URL, mock: true };
  }
  const progress = Math.round((elapsed / MOCK_DELAY_MS) * 100);
  return { status: "processing", progress, mock: true };
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  // Mock path — no RunPod needed
  if (jobId.startsWith("mock_")) {
    return NextResponse.json(resolveMockJob(jobId));
  }

  // Real RunPod path
  try {
    const { getJobStatus } = await import("@/lib/runpod");
    const result = await getJobStatus(jobId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

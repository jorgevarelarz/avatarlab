import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MOCK_RENDER   = process.env.MOCK_RENDER === "true";
export const MOCK_DELAY_MS = 8_000;

export async function POST(req: NextRequest) {
  const { photo_url, audio_url } = await req.json() as { photo_url: string; audio_url: string };

  if (!photo_url || !audio_url) {
    return NextResponse.json({ error: "photo_url and audio_url required" }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (MOCK_RENDER) {
    const jobId = `mock_${Date.now()}`;
    return NextResponse.json({ jobId, mock: true });
  }

  // Require auth + credits for real renders
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user || user.credits < 1) {
    return NextResponse.json({ error: "No credits" }, { status: 402 });
  }

  try {
    const { submitJob } = await import("@/lib/runpod");
    const runpodId = await submitJob(photo_url, audio_url);

    // Deduct credit and create job record atomically
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { credits: { decrement: 1 } } }),
      prisma.job.create({ data: { userId, runpodId, status: "queued", photoUrl: photo_url, audioUrl: audio_url } }),
    ]);

    return NextResponse.json({ jobId: runpodId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

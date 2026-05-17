import { NextRequest, NextResponse } from "next/server";
import { getUploadUrl, publicUrl } from "@/lib/r2";
import { v4 as uuid } from "uuid";

function folderFor(contentType: string): string {
  if (contentType.startsWith("image/")) return "inputs/images";
  if (contentType.startsWith("audio/")) return "inputs/audio";
  return "inputs/other";
}

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json() as { filename: string; contentType: string };

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  const ext    = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const folder = folderFor(contentType);
  const key    = `${folder}/${uuid()}.${ext}`;

  const uploadUrl = await getUploadUrl(key, contentType);
  return NextResponse.json({ uploadUrl, publicUrl: publicUrl(key), key });
}

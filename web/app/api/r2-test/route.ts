import { NextRequest, NextResponse } from "next/server";
import { testConnection, uploadBuffer, getObject, deleteObject, publicUrl } from "@/lib/r2";

export async function GET(req: NextRequest) {
  const del = req.nextUrl.searchParams.get("delete") === "true";
  const results: Record<string, unknown> = {};

  // 1. Connection check
  const conn = await testConnection();
  results.connection = conn;
  if (!conn.ok) return NextResponse.json(results, { status: 500 });

  // 2. Upload a small test file
  const testKey  = `_test/avatarlab-r2-test-${Date.now()}.txt`;
  const testBody = Buffer.from("AvatarLab R2 connection test OK");
  try {
    await uploadBuffer(testKey, testBody, "text/plain");
    results.upload = { ok: true, key: testKey, url: publicUrl(testKey) };
  } catch (e) {
    results.upload = { ok: false, error: String(e) };
    return NextResponse.json(results, { status: 500 });
  }

  // 3. Read it back
  try {
    const content = await getObject(testKey);
    results.read = { ok: true, content: content.toString() };
  } catch (e) {
    results.read = { ok: false, error: String(e) };
  }

  // 4. Delete (optional)
  if (del) {
    try {
      await deleteObject(testKey);
      results.delete = { ok: true };
    } catch (e) {
      results.delete = { ok: false, error: String(e) };
    }
  } else {
    results.delete = { skipped: true, hint: "Add ?delete=true to also delete the test file" };
  }

  results.summary = "R2 is working correctly";
  return NextResponse.json(results);
}

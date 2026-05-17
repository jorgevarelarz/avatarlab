import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function buildEndpoint(): string {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ENDPOINT or R2_ACCOUNT_ID must be set");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: buildEndpoint(),
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET         = process.env.R2_BUCKET ?? "avatarlab";
const PUBLIC_BASE    = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), cmd, { expiresIn: 300 });
}

export function publicUrl(key: string): string {
  return `${PUBLIC_BASE}/${key}`;
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: BUCKET }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function uploadBuffer(key: string, body: Buffer, contentType: string): Promise<string> {
  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body, ContentType: contentType,
  }));
  return publicUrl(key);
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getObject(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

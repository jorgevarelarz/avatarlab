function getConfig() {
  const apiKey     = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  if (!apiKey)     throw new Error("RUNPOD_API_KEY is not set");
  if (!endpointId) throw new Error("RUNPOD_ENDPOINT_ID is not set");
  return {
    apiKey,
    base: `https://api.runpod.ai/v2/${endpointId}`,
  };
}

// RunPod serverless statuses → our normalized values
// IN_QUEUE | IN_PROGRESS | COMPLETED | FAILED | CANCELLED | TIMED_OUT
export type JobStatus = "queued" | "processing" | "completed" | "failed";

function normalize(runpodStatus: string): JobStatus {
  switch (runpodStatus) {
    case "IN_QUEUE":    return "queued";
    case "IN_PROGRESS": return "processing";
    case "COMPLETED":   return "completed";
    case "FAILED":
    case "CANCELLED":
    case "TIMED_OUT":   return "failed";
    default:            return "queued";
  }
}

export async function submitJob(photo_url: string, audio_url: string): Promise<string> {
  const { apiKey, base } = getConfig();
  const res = await fetch(`${base}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: { photo_url, audio_url, enhance: true } }),
  });
  const data = await res.json() as { id?: string; error?: string };
  if (!res.ok || !data.id) {
    throw new Error(`RunPod submit failed (${res.status}): ${data.error ?? JSON.stringify(data)}`);
  }
  return data.id;
}

export async function getJobStatus(jobId: string): Promise<{
  status: JobStatus;
  video_url?: string;
  error?: string;
}> {
  const { apiKey, base } = getConfig();
  const res = await fetch(`${base}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json() as {
    status: string;
    output?: { video_url?: string; status?: string; error?: string };
  };

  return {
    status:    normalize(data.status),
    video_url: data.output?.video_url,
    error:     data.output?.error,
  };
}

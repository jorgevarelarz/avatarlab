"use client";

import { useState, useRef } from "react";

type Step = "idle" | "uploading" | "processing" | "done" | "error";

export default function Home() {
  const [photo, setPhoto]       = useState<File | null>(null);
  const [audio, setAudio]       = useState<File | null>(null);
  const [step, setStep]         = useState<Step>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const pollRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  async function uploadFile(file: File): Promise<string> {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const { uploadUrl, publicUrl } = await res.json() as { uploadUrl: string; publicUrl: string };
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    return publicUrl;
  }

  async function generate() {
    if (!photo || !audio) return;
    setStep("uploading");
    setError(null);

    try {
      const [photoUrl, audioUrl] = await Promise.all([uploadFile(photo), uploadFile(audio)]);

      setStep("processing");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_url: photoUrl, audio_url: audioUrl }),
      });
      const { jobId, error: err } = await res.json() as { jobId?: string; error?: string };
      if (!jobId) throw new Error(err ?? "No job ID");

      pollRef.current = setInterval(async () => {
        const s = await fetch(`/api/status?jobId=${jobId}`).then(r => r.json()) as {
          status: string; video_url?: string; error?: string;
        };
        if (s.status === "completed" && s.video_url) {
          clearInterval(pollRef.current!);
          setVideoUrl(s.video_url);
          setStep("done");
        } else if (s.status === "failed") {
          clearInterval(pollRef.current!);
          setError(s.error ?? "Job failed");
          setStep("error");
        }
      }, 5000);

    } catch (e) {
      setError(String(e));
      setStep("error");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0e1c", color: "#f4f6fb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "4rem 1.5rem" }}>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: "0 auto 1.25rem",
            background: "conic-gradient(from 90deg, #4d7cff, #a855f7, #22d3ee, #4d7cff)",
          }} />
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.5rem" }}>AvatarLab</h1>
          <p style={{ color: "#8b95b0", margin: 0 }}>Sube una foto + audio y genera un vídeo con cara animada</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <UploadCard label="Foto" accept="image/*" file={photo} onFile={setPhoto} icon="🖼️" />
          <UploadCard label="Audio" accept="audio/*" file={audio} onFile={setAudio} icon="🎙️" />
        </div>

        <button
          onClick={generate}
          disabled={!photo || !audio || step === "uploading" || step === "processing"}
          style={{
            width: "100%", height: 52, borderRadius: 12, border: "none", cursor: "pointer",
            background: photo && audio ? "linear-gradient(135deg, #4d7cff, #a855f7)" : "#1e2440",
            color: photo && audio ? "#fff" : "#4a5270",
            fontSize: 16, fontWeight: 600,
          }}
        >
          {step === "uploading"  ? "Subiendo archivos…" :
           step === "processing" ? "Generando vídeo… (~10 min)" :
           "Generar vídeo"}
        </button>

        {step === "processing" && (
          <div style={{ marginTop: 24, padding: "1rem 1.25rem", borderRadius: 10, background: "rgba(77,124,255,0.08)", border: "1px solid rgba(77,124,255,0.2)", color: "#8b95b0", fontSize: 14 }}>
            ⚙️ Procesando en GPU. Tarda entre 5 y 15 minutos según la duración del audio.
          </div>
        )}

        {step === "error" && (
          <div style={{ marginTop: 24, padding: "1rem 1.25rem", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 14 }}>
            ❌ {error}
          </div>
        )}

        {step === "done" && videoUrl && (
          <div style={{ marginTop: 24 }}>
            <video src={videoUrl} controls autoPlay style={{ width: "100%", borderRadius: 16, border: "1px solid #1e2440" }} />
            <a href={videoUrl} download style={{
              display: "block", marginTop: 12, textAlign: "center", padding: "0.75rem",
              borderRadius: 10, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
              color: "#6ee7b7", fontSize: 14, textDecoration: "none",
            }}>
              ⬇️ Descargar MP4
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function UploadCard({ label, accept, file, onFile, icon }: {
  label: string; accept: string; file: File | null; onFile: (f: File) => void; icon: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div onClick={() => ref.current?.click()} style={{
      border: `2px dashed ${file ? "#4d7cff" : "#1e2440"}`,
      borderRadius: 12, padding: "2rem 1rem", textAlign: "center", cursor: "pointer",
      background: file ? "rgba(77,124,255,0.06)" : "transparent",
    }}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div style={{ fontSize: "2rem", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {file
        ? <div style={{ fontSize: 12, color: "#4d7cff" }}>{file.name}</div>
        : <div style={{ fontSize: 12, color: "#4a5270" }}>Haz clic para seleccionar</div>
      }
    </div>
  );
}

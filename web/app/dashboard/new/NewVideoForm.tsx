"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type UploadState = "idle" | "uploading" | "ready";

export default function NewVideoForm() {
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const [photoState, setPhotoState] = useState<UploadState>("idle");
  const [audioState, setAudioState] = useState<UploadState>("idle");
  const [photoUrl, setPhotoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File, type: "photo" | "audio") {
    const contentType = file.type;
    const setter = type === "photo" ? setPhotoState : setAudioState;
    setter("uploading");

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType }),
    });
    const { uploadUrl, publicUrl } = await res.json();
    await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });

    if (type === "photo") setPhotoUrl(publicUrl);
    else setAudioUrl(publicUrl);
    setter("ready");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoUrl || !audioUrl) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_url: photoUrl, audio_url: audioUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setSubmitting(false);
    }
  }

  const ready = photoState === "ready" && audioState === "ready";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        onClick={() => photoRef.current?.click()}
        className="border-2 border-dashed border-zinc-700 hover:border-violet-500 rounded-xl p-8 text-center cursor-pointer transition"
      >
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "photo")}
        />
        {photoState === "idle" && (
          <>
            <p className="text-4xl mb-2">🖼️</p>
            <p className="text-zinc-300 font-medium">Sube tu foto</p>
            <p className="text-zinc-500 text-sm mt-1">JPG, PNG — cara frontal, bien iluminada</p>
          </>
        )}
        {photoState === "uploading" && <p className="text-zinc-400">Subiendo foto...</p>}
        {photoState === "ready" && <p className="text-green-400 font-medium">✓ Foto lista</p>}
      </div>

      <div
        onClick={() => audioRef.current?.click()}
        className="border-2 border-dashed border-zinc-700 hover:border-violet-500 rounded-xl p-8 text-center cursor-pointer transition"
      >
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "audio")}
        />
        {audioState === "idle" && (
          <>
            <p className="text-4xl mb-2">🎙️</p>
            <p className="text-zinc-300 font-medium">Sube tu audio</p>
            <p className="text-zinc-500 text-sm mt-1">MP3, WAV, M4A — máx. 60s recomendado</p>
          </>
        )}
        {audioState === "uploading" && <p className="text-zinc-400">Subiendo audio...</p>}
        {audioState === "ready" && <p className="text-green-400 font-medium">✓ Audio listo</p>}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!ready || submitting}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
      >
        {submitting ? "Generando vídeo..." : "Generar vídeo (1 crédito)"}
      </button>
    </form>
  );
}

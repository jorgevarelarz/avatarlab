"use client";
import { useState } from "react";

type Job = {
  id: string;
  status: string;
  videoUrl: string | null;
  createdAt: Date;
};

const statusLabel: Record<string, string> = {
  pending:    "Pendiente",
  queued:     "En cola",
  processing: "Procesando...",
  completed:  "Completado",
  failed:     "Error",
};

const statusColor: Record<string, string> = {
  pending:    "text-zinc-400",
  queued:     "text-yellow-400",
  processing: "text-blue-400",
  completed:  "text-green-400",
  failed:     "text-red-400",
};

export default function JobList({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs] = useState(initialJobs);

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-5xl mb-4">🎬</p>
        <p className="text-lg font-medium text-zinc-300">Aún no tienes vídeos</p>
        <p className="text-sm mt-1">Crea tu primer vídeo con cara animada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Tus vídeos</h2>
      {jobs.map(job => (
        <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${statusColor[job.status] ?? "text-zinc-400"}`}>
              {statusLabel[job.status] ?? job.status}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {new Date(job.createdAt).toLocaleDateString("es-ES", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          {job.videoUrl && job.status === "completed" && (
            <a
              href={job.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition"
            >
              Ver vídeo ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

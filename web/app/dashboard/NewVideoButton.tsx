"use client";
import { useRouter } from "next/navigation";

export default function NewVideoButton({ credits }: { credits: number }) {
  const router = useRouter();
  return (
    <button
      onClick={() => credits > 0 ? router.push("/dashboard/new") : router.push("/pricing")}
      className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
    >
      {credits > 0 ? "+ Nuevo vídeo" : "Comprar créditos"}
    </button>
  );
}

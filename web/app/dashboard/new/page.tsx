import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewVideoForm from "./NewVideoForm";

export default async function NewVideoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  if (!user || user.credits < 1) redirect("/pricing");

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <a href="/dashboard" className="text-zinc-400 hover:text-white text-sm transition">← Volver</a>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">Nuevo vídeo</h1>
        <p className="text-zinc-400 text-sm mb-8">Sube una foto con tu cara y un audio. Generamos el vídeo en minutos.</p>
        <NewVideoForm />
      </main>
    </div>
  );
}

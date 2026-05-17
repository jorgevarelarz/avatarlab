import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import NewVideoButton from "./NewVideoButton";
import JobList from "./JobList";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, credits: true },
  });

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">AvatarLab</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            <span className="text-violet-400 font-semibold">{user?.credits ?? 0}</span> créditos
          </span>
          <Link href="/pricing" className="text-sm bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg transition">
            Comprar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Hola, {user?.name?.split(" ")[0] ?? "ahí"} 👋</h1>
            <p className="text-zinc-400 text-sm mt-1">Genera vídeos con tu cara animada.</p>
          </div>
          <NewVideoButton credits={user?.credits ?? 0} />
        </div>

        <JobList initialJobs={jobs} />
      </main>
    </div>
  );
}

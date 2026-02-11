"use client";

import { useRouter } from "next/navigation";
import { KanbanBoard } from "../components/KanbanBoard";
import { KanbanHeader } from "../components/KanbanHeader";
import { useKanbanData } from "../hooks/useKanbanData";

export function KanbanPage() {
  const router = useRouter();
  const { user, columns, tasks, isLoading, error, moveTaskToStatus, logout } = useKanbanData();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return (
    <main className="min-h-screen bg-[#eceff3] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4">
        <KanbanHeader user={user} onLogout={handleLogout} />

        {error ? (
          <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[24px] border border-[#d7dbe3] bg-white px-6 py-8 text-sm text-[#475569] shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            Loading Kanban data...
          </div>
        ) : (
          <KanbanBoard columns={columns} tasks={tasks} onMoveTask={moveTaskToStatus} />
        )}
      </div>
    </main>
  );
}


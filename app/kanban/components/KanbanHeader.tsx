import { AccountMenu } from "./AccountMenu";
import type { KanbanUser } from "../types/kanban";

type KanbanHeaderProps = {
  user: KanbanUser | null;
  onLogout: () => Promise<void>;
};

export function KanbanHeader({ user, onLogout }: KanbanHeaderProps) {
  return (
    <header className="border border-[#d7dbe3] bg-white px-[20px] py-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-0 text-3xl font-semibold text-[#0f172a]">My Tasks</h1>
          <p className="mt-1 text-sm text-[#64748b]">Monitor all of your tasks here</p>
        </div>

        <AccountMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}


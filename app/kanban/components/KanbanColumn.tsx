"use client";

import { useDroppable } from "@dnd-kit/core";
import { TaskTile } from "./TaskTile";
import type { KanbanStatusColumn, KanbanTask } from "../types/kanban";

type KanbanColumnProps = {
  column: KanbanStatusColumn;
  tasks: KanbanTask[];
};

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: "column",
      statusId: column.id,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`w-[280px] shrink-0 rounded-2xl border bg-[#f8fafc] p-3 transition ${
        isOver ? "border-[#64748b] ring-2 ring-[#cbd5e1]" : "border-[#d5d8df]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0f172a]">{column.title}</h2>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 text-xs font-semibold text-[#475569]">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskTile key={task.id} task={task} statusLabel={column.title} />
        ))}
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cbd5e1] px-3 py-6 text-center text-xs text-[#64748b]">
            Drop tasks here
          </div>
        ) : null}
      </div>
    </section>
  );
}


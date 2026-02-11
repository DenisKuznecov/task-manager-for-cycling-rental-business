"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { KanbanTask } from "../types/kanban";

type TaskTileProps = {
  task: KanbanTask;
  statusLabel: string;
};

function formatDueDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? "")
    .join("");
}

export function TaskTile({ task, statusLabel }: TaskTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: "task",
      taskId: task.id,
      statusId: task.statusId,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-[#e2e8f0] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition ${
        isDragging ? "opacity-60 ring-2 ring-[#94a3b8]" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <h3 className="text-sm font-semibold leading-5 text-[#0f172a]">{task.title}</h3>
      <p className="mt-1 text-xs font-medium text-[#64748b]">{statusLabel}</p>

      <div className="mt-3 flex items-center justify-between text-xs text-[#475569]">
        <span>Assignee</span>
        <span className="font-medium text-[#0f172a]">{task.assignee}</span>
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-[#475569]">
        <span>Due date</span>
        <span className="font-medium text-[#0f172a]">{formatDueDate(task.dueDate)}</span>
      </div>

      <p
        className="mt-3 text-xs leading-5 text-[#64748b] overflow-hidden text-ellipsis"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {task.description}
      </p>

      <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#f8fafc] px-2 py-1">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e2e8f0] text-[10px] font-semibold text-[#0f172a]">
          {getInitials(task.assignee)}
        </span>
        <span className="text-[11px] font-medium text-[#334155]">{task.assignee}</span>
      </div>
    </article>
  );
}


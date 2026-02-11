"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import type { KanbanStatusColumn, KanbanTask } from "../types/kanban";

type KanbanBoardProps = {
  columns: KanbanStatusColumn[];
  tasks: KanbanTask[];
  onMoveTask: (taskId: string, statusId: string) => Promise<void>;
};

function resolveDropStatusId(event: DragEndEvent): string | null {
  if (!event.over) {
    return null;
  }

  const overData = event.over.data.current as { type?: string; statusId?: string } | undefined;

  if (overData?.statusId) {
    return overData.statusId;
  }

  if (typeof event.over.id === "string" && event.over.id.startsWith("column-")) {
    return event.over.id.replace("column-", "");
  }

  return null;
}

export function KanbanBoard({ columns, tasks, onMoveTask }: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const sortedColumns = [...columns].sort((left, right) => left.order - right.order);

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeData = event.active.data.current as
      | { type?: string; taskId?: string; statusId?: string }
      | undefined;

    if (activeData?.type !== "task" || !activeData.taskId || !activeData.statusId) {
      return;
    }

    const destinationStatusId = resolveDropStatusId(event);

    if (!destinationStatusId || destinationStatusId === activeData.statusId) {
      return;
    }

    await onMoveTask(activeData.taskId, destinationStatusId);
  };

  return (
    <section className="rounded-[24px] border border-[#d7dbe3] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(37,99,235,0.32)] transition hover:bg-[#1d4ed8]"
        >
          + Add New Task
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {sortedColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks.filter((task) => task.statusId === column.id)}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}


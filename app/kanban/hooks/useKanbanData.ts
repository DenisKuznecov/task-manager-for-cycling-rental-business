"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { kanbanService } from "../services/kanbanService";
import type { KanbanStatusColumn, KanbanTask, KanbanUser } from "../types/kanban";

type UseKanbanDataResult = {
  user: KanbanUser | null;
  columns: KanbanStatusColumn[];
  tasks: KanbanTask[];
  isLoading: boolean;
  error: string | null;
  moveTaskToStatus: (taskId: string, statusId: string) => Promise<void>;
  logout: () => Promise<void>;
};

export function useKanbanData(): UseKanbanDataResult {
  const [user, setUser] = useState<KanbanUser | null>(null);
  const [columns, setColumns] = useState<KanbanStatusColumn[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const bootstrapData = await kanbanService.fetchBootstrapData();

        if (!isMounted) {
          return;
        }

        setUser(bootstrapData.user);
        setColumns(bootstrapData.columns);
        setTasks(bootstrapData.tasks);
      } catch {
        if (!isMounted) {
          return;
        }

        setError("Unable to load Kanban data. Please try again.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const moveTaskToStatus = useCallback(async (taskId: string, statusId: string) => {
    let previousTasks: KanbanTask[] = [];

    setTasks((currentTasks) => {
      previousTasks = currentTasks;
      return currentTasks.map((task) =>
        task.id === taskId ? { ...task, statusId } : task,
      );
    });

    try {
      await kanbanService.updateTaskStatus({ taskId, statusId });
      setError(null);
    } catch {
      setTasks(previousTasks);
      setError("Unable to move task right now. Please try again.");
    }
  }, []);

  const logout = useCallback(async () => {
    await kanbanService.logout();
  }, []);

  return useMemo(
    () => ({
      user,
      columns,
      tasks,
      isLoading,
      error,
      moveTaskToStatus,
      logout,
    }),
    [user, columns, tasks, isLoading, error, moveTaskToStatus, logout],
  );
}


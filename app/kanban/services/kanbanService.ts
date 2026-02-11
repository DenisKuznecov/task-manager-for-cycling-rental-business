import { mockKanbanBootstrapDto } from "../data/mockKanbanData";
import { mapBootstrapDtoToDomain, mapMoveTaskInputToDto } from "../mappers/kanbanMappers";
import type { KanbanBoardData, MoveTaskInput } from "../types/kanban";
import type { ApiKanbanBootstrapDto } from "../types/kanban.dto";

const USE_MOCK_KANBAN_SERVICE = true;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type KanbanService = {
  fetchBootstrapData: () => Promise<KanbanBoardData>;
  updateTaskStatus: (input: MoveTaskInput) => Promise<void>;
  logout: () => Promise<void>;
};

class MockKanbanService implements KanbanService {
  private bootstrapDto: ApiKanbanBootstrapDto = deepClone(mockKanbanBootstrapDto);

  async fetchBootstrapData(): Promise<KanbanBoardData> {
    await sleep(120);
    return mapBootstrapDtoToDomain(deepClone(this.bootstrapDto));
  }

  async updateTaskStatus(input: MoveTaskInput): Promise<void> {
    await sleep(80);

    const payload = mapMoveTaskInputToDto(input);
    const targetTask = this.bootstrapDto.tasks.find((task) => task.id === payload.task_id);

    if (!targetTask) {
      throw new Error("Task not found.");
    }

    targetTask.status_id = payload.status_id;
  }

  async logout(): Promise<void> {
    await sleep(100);
  }
}

class BackendKanbanService implements KanbanService {
  async fetchBootstrapData(): Promise<KanbanBoardData> {
    throw new Error("Backend Kanban service is not connected yet.");
  }

  async updateTaskStatus(input: MoveTaskInput): Promise<void> {
    void input;
    throw new Error("Backend task status update is not connected yet.");
  }

  async logout(): Promise<void> {
    throw new Error("Backend logout is not connected yet.");
  }
}

export const kanbanService: KanbanService = USE_MOCK_KANBAN_SERVICE
  ? new MockKanbanService()
  : new BackendKanbanService();


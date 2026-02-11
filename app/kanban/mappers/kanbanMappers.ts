import type {
  ApiKanbanBootstrapDto,
  ApiMoveTaskRequestDto,
  ApiStatusColumnDto,
  ApiTaskDto,
  ApiUserDto,
} from "../types/kanban.dto";
import type {
  KanbanBoardData,
  KanbanStatusColumn,
  KanbanTask,
  KanbanUser,
  MoveTaskInput,
} from "../types/kanban";

function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "NA";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function mapUserDtoToDomain(dto: ApiUserDto): KanbanUser {
  return {
    id: dto.id,
    name: dto.full_name,
    email: dto.email,
    role: dto.role,
    avatarInitials: getInitials(dto.full_name),
  };
}

export function mapColumnDtoToDomain(dto: ApiStatusColumnDto): KanbanStatusColumn {
  return {
    id: dto.id,
    key: dto.key,
    title: dto.title,
    order: dto.order,
  };
}

export function mapTaskDtoToDomain(dto: ApiTaskDto): KanbanTask {
  return {
    id: dto.id,
    title: dto.title,
    statusId: dto.status_id,
    assignee: dto.assignee_name,
    dueDate: dto.due_date,
    description: dto.description,
  };
}

export function mapBootstrapDtoToDomain(dto: ApiKanbanBootstrapDto): KanbanBoardData {
  return {
    user: mapUserDtoToDomain(dto.user),
    columns: dto.columns.map(mapColumnDtoToDomain),
    tasks: dto.tasks.map(mapTaskDtoToDomain),
  };
}

export function mapMoveTaskInputToDto(input: MoveTaskInput): ApiMoveTaskRequestDto {
  return {
    task_id: input.taskId,
    status_id: input.statusId,
  };
}


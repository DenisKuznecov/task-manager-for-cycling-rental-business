export type KanbanUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
};

export type KanbanStatusColumn = {
  id: string;
  key: string;
  title: string;
  order: number;
};

export type KanbanTask = {
  id: string;
  title: string;
  statusId: string;
  assignee: string;
  dueDate: string;
  description: string;
};

export type KanbanBoardData = {
  user: KanbanUser;
  columns: KanbanStatusColumn[];
  tasks: KanbanTask[];
};

export type MoveTaskInput = {
  taskId: string;
  statusId: string;
};


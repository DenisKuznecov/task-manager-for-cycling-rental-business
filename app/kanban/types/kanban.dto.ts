export type ApiUserDto = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export type ApiStatusColumnDto = {
  id: string;
  key: string;
  title: string;
  order: number;
};

export type ApiTaskDto = {
  id: string;
  title: string;
  status_id: string;
  assignee_name: string;
  due_date: string;
  description: string;
};

export type ApiKanbanBootstrapDto = {
  user: ApiUserDto;
  columns: ApiStatusColumnDto[];
  tasks: ApiTaskDto[];
};

export type ApiMoveTaskRequestDto = {
  task_id: string;
  status_id: string;
};


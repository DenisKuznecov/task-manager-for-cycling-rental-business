import type { AuthRole } from "./auth.types";

export type User = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  createdAt?: string;
  avatarUrl?: string;
};


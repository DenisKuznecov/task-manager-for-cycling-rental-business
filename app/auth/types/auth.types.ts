export type AuthRole = "partner" | "worker";

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  name: string;
  email: string;
  password: string;
  role: AuthRole;
};


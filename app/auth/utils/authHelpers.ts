import type { LoginPayload, SignUpPayload } from "../types/auth.types";
import type { User } from "../types/user.types";

export async function loginWithEmailPassword(
  payload: LoginPayload,
): Promise<User | null> {
  // TODO: Replace with real API call / auth integration.
  console.log("loginWithEmailPassword payload", payload);

  return {
    id: "demo-user-id",
    name: "Demo User",
    email: payload.email,
    role: "partner",
  };
}

export async function signUpUser(payload: SignUpPayload): Promise<User> {
  // TODO: Replace with real API call / auth integration.
  console.log("signUpUser payload", payload);

  return {
    id: "new-user-id",
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
}



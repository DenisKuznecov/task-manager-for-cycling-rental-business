"use client";

import Link from "next/link";
import { AuthLayout } from "../components/AuthLayout";
import { InputField } from "../components/InputField";
import { SelectField } from "../components/SelectField";
import { Button } from "../components/Button";
import { signUpUser } from "../utils/authHelpers";
import type { AuthRole } from "../types/auth.types";

const ROLE_OPTIONS: { label: string; value: AuthRole }[] = [
  { label: "Partner", value: "partner" },
  { label: "Worker", value: "worker" },
];

export function SignUpPage() {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const role = String(formData.get("role") || "worker") as AuthRole;

    await signUpUser({ name, email, password, role });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Sign up to start organizing your cycling rental operations."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <InputField
            label="Name"
            name="name"
            type="text"
            placeholder="Alex Rider"
            autoComplete="name"
            required
          />
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <SelectField
            label="Role"
            name="role"
            placeholder="Select your role"
            options={ROLE_OPTIONS}
            defaultValue=""
            required
          />
        </div>

        <div className="text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Log in
          </Link>
        </div>

        <Button type="submit" fullWidth>
          Sign up
        </Button>
      </form>
    </AuthLayout>
  );
}


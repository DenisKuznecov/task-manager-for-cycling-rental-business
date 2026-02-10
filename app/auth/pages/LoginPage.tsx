"use client";

import Link from "next/link";
import { AuthLayout } from "../components/AuthLayout";
import { InputField } from "../components/InputField";
import { Button } from "../components/Button";
import { loginWithEmailPassword } from "../utils/authHelpers";

export function LoginPage() {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    await loginWithEmailPassword({ email, password });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your cycling rentals and tasks."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
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
            autoComplete="current-password"
            required
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Forgot password?
          </button>
          <span className="text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </Link>
          </span>
        </div>

        <Button type="submit" fullWidth>
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}


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
      title="Login to App Name"
      subtitle="Securely access your account with your email and password. Fast, simple, and protected login to get you started."
      footer={
        <Link href="/auth/signup" className="inline-flex py-2">
          <Button variant="secondary">Signup</Button>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <InputField
            name="email"
            type="email"
            placeholder="Email or Username"
            autoComplete="email"
            required
          />
          <InputField
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            endAdornment={<span className="text-lg leading-none">~</span>}
            required
          />
          <div className="flex justify-end pt-2 pb-3">
            <Link
              href="/auth/forgot-password"
              className="rounded-md px-2 py-1.5 text-xs font-semibold text-[#222630] hover:text-[#111318]"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <div className="mt-4 py-3">
          <Button type="submit" fullWidth>
            Login
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}


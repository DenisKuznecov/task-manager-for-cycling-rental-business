"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "../components/AuthLayout";
import { InputField } from "../components/InputField";
import { Button } from "../components/Button";
import { signUpUser } from "../utils/authHelpers";

export function SignUpPage() {
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.currentTarget);

    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setFormError("Password and Confirm Password must match.");
      return;
    }

    const role = "worker";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();

    await signUpUser({ name, email, password, role });
  };

  return (
    <AuthLayout
      title="Setup your profile"
      subtitle="Create your account to get started in just a few steps. Join us today and unlock full access instantly."
      footer={
        <Link href="/auth/login" className="inline-flex py-2">
          <Button variant="secondary">Login</Button>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2.5">
          <InputField
            name="firstName"
            type="text"
            placeholder="First Name"
            autoComplete="given-name"
            aria-label="First Name"
            required
          />
          <InputField
            name="lastName"
            type="text"
            placeholder="Last Name"
            autoComplete="family-name"
            aria-label="Last Name"
            required
          />
          <InputField
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            aria-label="Email"
            required
          />
          <InputField
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            aria-label="Password"
            endAdornment={<span className="text-lg leading-none">~</span>}
            required
          />
          <InputField
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            autoComplete="new-password"
            aria-label="Confirm Password"
            endAdornment={<span className="text-lg leading-none">~</span>}
            required
          />
        </div>

        {formError ? (
          <p className="text-xs font-medium text-[#dc2626]" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="mt-4 py-3">
          <Button type="submit" fullWidth>
            Signup
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}


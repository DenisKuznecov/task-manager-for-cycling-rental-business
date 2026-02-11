"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "../components/AuthLayout";
import { InputField } from "../components/InputField";
import { Button } from "../components/Button";

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setError("Password and Confirm Password must match.");
      return;
    }

    setSuccessMessage("Password updated. You can now log in with your new password.");
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Reset your password easily in just a few steps."
      footer={
        <Link href="/auth/login" className="inline-flex py-2">
          <Button variant="secondary">Back to login</Button>
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        {error ? (
          <p className="text-xs font-medium text-[#dc2626]" role="alert">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-xs font-medium text-[#15803d]" role="status">
            {successMessage}
          </p>
        ) : null}

        <div className="mt-4 py-2">
          <Button type="submit" fullWidth>
            Submit
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

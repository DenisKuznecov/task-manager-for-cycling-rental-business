import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  fullWidth?: boolean;
  variant?: "primary" | "secondary";
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  fullWidth,
  variant = "primary",
  loading,
  className = "",
  disabled,
  ...buttonProps
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  const variants: Record<typeof variant, string> = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-200",
    secondary:
      "bg-slate-800 text-slate-50 hover:bg-slate-700 focus-visible:ring-slate-600 disabled:bg-slate-900 disabled:text-slate-400",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}


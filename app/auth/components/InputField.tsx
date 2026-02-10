import type { InputHTMLAttributes } from "react";

type InputFieldProps = {
  label: string;
  name: string;
  error?: string | null;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

export function InputField({
  label,
  name,
  error,
  className = "",
  ...inputProps
}: InputFieldProps) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-slate-200"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        className={`block w-full rounded-lg border bg-slate-900/60 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          hasError ? "border-red-500" : "border-slate-700"
        } ${className}`}
        {...inputProps}
      />
      {hasError ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}


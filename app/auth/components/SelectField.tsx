import type { SelectHTMLAttributes } from "react";

type Option<T extends string = string> = {
  label: string;
  value: T;
};

type SelectFieldProps<T extends string = string> = {
  label: string;
  name: string;
  options: Option<T>[];
  placeholder?: string;
  error?: string | null;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name">;

export function SelectField<T extends string = string>({
  label,
  name,
  options,
  placeholder,
  error,
  className = "",
  ...selectProps
}: SelectFieldProps<T>) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-slate-200"
      >
        {label}
      </label>
      <select
        id={name}
        name={name}
        className={`block w-full rounded-lg border bg-slate-900/60 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          hasError ? "border-red-500" : "border-slate-700"
        } ${className}`}
        {...selectProps}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}


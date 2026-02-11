import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

type InputFieldProps = {
  label?: string;
  name: string;
  error?: string | null;
  endAdornment?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

export function InputField({
  label,
  name,
  error,
  endAdornment,
  className = "",
  ...inputProps
}: InputFieldProps) {
  const hasError = Boolean(error);
  const inlineInputStyle: CSSProperties = {
    paddingLeft: "22px",
    paddingRight: endAdornment ? "52px" : "22px",
    paddingTop: "14px",
    paddingBottom: "14px",
    ...(inputProps.style as CSSProperties | undefined),
  };

  return (
    <div className="space-y-2 py-2.5" style={{ marginBottom: "16px" }}>
      {label ? (
        <label
          htmlFor={name}
          className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#6f7480]"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={name}
          name={name}
          className={`block h-16 w-full rounded-full border-2 bg-[#f6f7f9] px-6 text-[16px] font-medium text-[#4b525e] outline-none transition placeholder:font-medium placeholder:text-[#9da3ad] focus-visible:border-[#b5bac4] focus-visible:bg-white ${
            hasError ? "border-[#ef4444]" : "border-[#d3d6dc]"
          } ${endAdornment ? "pr-11" : ""} ${className}`}
          style={inlineInputStyle}
          {...inputProps}
        />
        {endAdornment ? (
          <span className="pointer-events-none absolute inset-y-0 right-6 flex items-center text-[#b3b8c1]">
            {endAdornment}
          </span>
        ) : null}
      </div>
      {hasError ? (
        <p className="text-xs text-[#dc2626]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}


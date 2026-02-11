import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "surface";
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
    "inline-flex h-16 items-center justify-center rounded-full px-6 text-[15px] font-semibold outline-none transition";

  const variants: Record<typeof variant, string> = {
    primary:
      "bg-[#0b0d12] text-white shadow-[0_8px_14px_rgba(15,16,20,0.3)] hover:bg-[#1a1c23] focus-visible:ring-2 focus-visible:ring-[#5d6270] disabled:bg-[#71747e] disabled:text-[#dadce1]",
    secondary:
      "border border-[#c6cad2] bg-white text-[#262a33] hover:bg-[#f2f3f5] focus-visible:ring-2 focus-visible:ring-[#c2c7cf] disabled:border-[#e3e5e9] disabled:text-[#9ca1ac]",
    surface:
      "border border-[#d5d8df] bg-[#f7f8fa] text-[#282c34] hover:bg-[#eff1f4] focus-visible:ring-2 focus-visible:ring-[#c9cdd5] disabled:text-[#9ca1ac]",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      style={variant === "primary" ? { color: "#ffffff", height: "64px" } : { height: "64px" }}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}


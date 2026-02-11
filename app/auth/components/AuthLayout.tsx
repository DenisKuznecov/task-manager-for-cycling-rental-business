import Image from "next/image";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  cardClassName?: string;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  cardClassName = "",
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e9eaec] px-4 py-10">
      <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#dcdde0]" />
      <div className="pointer-events-none absolute -left-14 top-16 h-44 w-44 rounded-full bg-[#f1f2f3]" />
      <div className="pointer-events-none absolute -bottom-10 right-1/3 h-36 w-36 rounded-full bg-[#dbdde0]" />

      <div
        className={`relative w-full max-w-[420px] overflow-hidden rounded-[32px] border border-[#d6d8dc] bg-white shadow-[0_18px_32px_rgba(15,23,42,0.16)] ${cardClassName}`}
      >
        <div className="sm:px-9 sm:py-9" style={{ padding: "42px 40px 36px" }}>
          <div className="mb-6 space-y-4">
            <Image
              src="/logo-dots-orange.png"
              alt="Brand logo"
              width={64}
              height={64}
              className="h-11 w-11 rounded-md object-cover"
              priority
            />
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#1e2026] sm:text-[31px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-[320px] text-[12px] leading-5 text-[#7b808c] sm:text-[13px]">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="space-y-6">
            {children}
            {footer ? (
              <div className="mt-4 flex justify-end py-2">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


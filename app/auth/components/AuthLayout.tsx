import { Logo } from "./Logo";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 p-8 shadow-xl ring-1 ring-slate-800">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}


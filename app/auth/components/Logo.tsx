export function Logo() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 ring-1 ring-slate-700">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
        CT
      </span>
      <div className="text-left">
        <span className="block text-sm font-semibold tracking-tight text-slate-50">
          CycleTasker
        </span>
        <span className="block text-[11px] text-slate-400">
          Cycling rental task manager
        </span>
      </div>
    </div>
  );
}


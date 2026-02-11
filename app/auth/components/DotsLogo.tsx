export function DotsLogo() {
  const dotClass = "h-2.5 w-2.5 rounded-full bg-[#f8a23f]";

  return (
    <div
      className="inline-grid grid-cols-3 gap-1.5 rounded-md bg-black p-2"
      aria-label="Brand logo"
      role="img"
    >
      <span className="invisible" />
      <span className={dotClass} />
      <span className={dotClass} />
      <span className={dotClass} />
      <span className={dotClass} />
      <span className="invisible" />
      <span className={dotClass} />
      <span className={dotClass} />
      <span className="invisible" />
    </div>
  );
}

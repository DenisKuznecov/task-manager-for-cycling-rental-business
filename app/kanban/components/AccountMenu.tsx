"use client";

import { useEffect, useRef, useState } from "react";
import type { KanbanUser } from "../types/kanban";

type AccountMenuProps = {
  user: KanbanUser | null;
  onLogout: () => Promise<void>;
};

export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const avatarText = user?.avatarInitials || "NA";

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);

    try {
      await onLogout();
      setIsOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#e5e7eb] text-[11px] font-semibold text-[#111827] transition hover:bg-[#d1d5db]"
      >
        {avatarText}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute top-12 right-0 z-30 w-72 rounded-2xl border border-[#d7dbe3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.14)]"
        >
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">
                Email
              </p>
              <p className="mt-1 text-sm font-medium text-[#111827]">{user?.email || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">
                Role
              </p>
              <p className="mt-1 text-sm font-medium text-[#111827]">{user?.role || "-"}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogoutClick}
              disabled={isLoggingOut}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#d5d8df] bg-[#f8fafc] text-sm font-semibold text-[#111827] transition hover:bg-[#eff2f6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


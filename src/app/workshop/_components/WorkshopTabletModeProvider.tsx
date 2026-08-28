"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  readWorkshopTabletMode,
  WORKSHOP_TABLET_MODE_KEY,
  writeWorkshopTabletMode,
} from "./workshop-tablet-mode";

interface WorkshopTabletModeContextValue {
  tabletMode: boolean;
  setTabletMode: (value: boolean) => void;
}

const WorkshopTabletModeContext =
  createContext<WorkshopTabletModeContextValue | null>(null);

const listeners = new Set<() => void>();

function emitWorkshopTabletMode() {
  listeners.forEach((listener) => listener());
}

function subscribeWorkshopTabletMode(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === WORKSHOP_TABLET_MODE_KEY) {
      emitWorkshopTabletMode();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getWorkshopTabletModeSnapshot() {
  try {
    return readWorkshopTabletMode(window.localStorage);
  } catch {
    return false;
  }
}

function getWorkshopTabletModeServerSnapshot() {
  return false;
}

export function WorkshopTabletModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const tabletMode = useSyncExternalStore(
    subscribeWorkshopTabletMode,
    getWorkshopTabletModeSnapshot,
    getWorkshopTabletModeServerSnapshot,
  );

  const setTabletMode = useCallback((value: boolean) => {
    try {
      writeWorkshopTabletMode(window.localStorage, value);
    } catch (error) {
      console.error("workshop: failed to persist tablet mode", error);
    }
    emitWorkshopTabletMode();
  }, []);

  const value = useMemo(
    () => ({ tabletMode, setTabletMode }),
    [tabletMode, setTabletMode],
  );

  return (
    <WorkshopTabletModeContext.Provider value={value}>
      {children}
    </WorkshopTabletModeContext.Provider>
  );
}

export function useWorkshopTabletMode(): WorkshopTabletModeContextValue {
  const context = useContext(WorkshopTabletModeContext);
  if (!context) {
    throw new Error(
      "useWorkshopTabletMode must be used within WorkshopTabletModeProvider",
    );
  }
  return context;
}

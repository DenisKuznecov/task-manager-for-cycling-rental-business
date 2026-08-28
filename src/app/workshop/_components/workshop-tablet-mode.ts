export const WORKSHOP_TABLET_MODE_KEY = "workshop.tabletMode";

export function readWorkshopTabletMode(
  storage: Pick<Storage, "getItem">,
): boolean {
  try {
    return storage.getItem(WORKSHOP_TABLET_MODE_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeWorkshopTabletMode(
  storage: Pick<Storage, "setItem">,
  tabletMode: boolean,
): void {
  try {
    storage.setItem(WORKSHOP_TABLET_MODE_KEY, tabletMode ? "on" : "off");
  } catch (error) {
    console.error("workshop: failed to persist tablet mode", error);
  }
}

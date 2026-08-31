const BOOQABLE_NEXT_ACTION =
  " Save the customer in Booqable again after fixing this.";
const LOCAL_NEXT_ACTION = " Upload again after fixing this.";

export function destNextAction(tool: string, detail: string): string {
  return `${tool}: ${detail}${BOOQABLE_NEXT_ACTION}`;
}

export function destLocalNextAction(tool: string, detail: string): string {
  return `${tool}: ${detail}${LOCAL_NEXT_ACTION}`;
}

export function localizeDestError(error: string): string {
  return error.includes(BOOQABLE_NEXT_ACTION)
    ? error.replace(BOOQABLE_NEXT_ACTION, LOCAL_NEXT_ACTION)
    : error;
}

export function destToolName(name: "google" | "holded" | "mailchimp"): string {
  if (name === "google") return "Google Contacts";
  if (name === "holded") return "Holded";
  return "Mailchimp";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function presentString(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function omitEmpty<T extends Record<string, unknown>>(
  value: T,
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === undefined || entry === "") continue;
    out[key] = entry;
  }
  return out as Partial<T>;
}

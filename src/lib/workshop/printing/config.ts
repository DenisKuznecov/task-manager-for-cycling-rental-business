import { validateTarget } from "./epos.ts";

const DEFAULT_PRINTER_ADDRESS = "http://192.168.1.38";
const DEFAULT_PRINTER_DEVICE_ID = "local_printer";

export type WorkshopPrinterConfig =
  | { ok: true; target: string }
  | { ok: false; error: string };

/** Resolve on the server; only the validated ePOS endpoint reaches the browser. */
export function resolveWorkshopPrinterConfig(
  environment: Record<string, string | undefined> = process.env,
): WorkshopPrinterConfig {
  const address =
    environment.WORKSHOP_PRINTER_ADDRESS === undefined
      ? DEFAULT_PRINTER_ADDRESS
      : environment.WORKSHOP_PRINTER_ADDRESS.trim();
  const deviceId =
    environment.WORKSHOP_PRINTER_DEVICE_ID === undefined
      ? DEFAULT_PRINTER_DEVICE_ID
      : environment.WORKSHOP_PRINTER_DEVICE_ID.trim();
  const target = validateTarget(address, deviceId);
  return target.ok
    ? target
    : { ok: false, error: `Workshop printer configuration is invalid: ${target.error}` };
}

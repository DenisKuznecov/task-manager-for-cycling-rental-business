import type {
  WorkshopAttestation,
  WorkshopTaskItem,
  WorkshopTaskListRow,
} from "../domain/index.ts";
import { EPOS_NAMESPACE } from "./epos.ts";

const SOAP_NAMESPACE = "http://schemas.xmlsoap.org/soap/envelope/";
const PAPER_COLUMNS = 48;

type DocumentTask = Pick<
  WorkshopTaskListRow,
  "bikeDisplayId" | "bikeSourceId" | "bikeTitle" | "orderNumber"
>;

type M1DocumentInput = {
  task: DocumentTask;
  m1: WorkshopAttestation;
  m1SignedAt: string;
};

type M2DocumentInput = M1DocumentInput & {
  m2: WorkshopAttestation;
  items: WorkshopTaskItem[];
};

function ascii(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Preserve every character while breaking long values into 48-column thermal lines. */
export function wrapThermalText(value: string, columns = PAPER_COLUMNS): string[] {
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new RangeError("Thermal paper width must be a positive integer.");
  }
  const result: string[] = [];
  for (const rawLine of ascii(value).split("\n")) {
    if (rawLine.length === 0) {
      result.push("");
      continue;
    }
    let remaining = rawLine;
    while (remaining.length > columns) {
      const breakAt = remaining.lastIndexOf(" ", columns - 1);
      if (breakAt > 0) {
        result.push(remaining.slice(0, breakAt + 1));
        remaining = remaining.slice(breakAt + 1);
      } else {
        result.push(remaining.slice(0, columns));
        remaining = remaining.slice(columns);
      }
    }
    result.push(remaining);
  }
  return result;
}

function text(lines: string[], attributes = ""): string {
  return `<text${attributes}>${escapeXml(lines.flatMap((line) => wrapThermalText(line)).join("\n"))}\n</text>`;
}

function soap(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="${SOAP_NAMESPACE}"><s:Body><epos-print xmlns="${EPOS_NAMESPACE}">${body}</epos-print></s:Body></s:Envelope>`;
}

function stockId(task: DocumentTask): string {
  return task.bikeDisplayId?.trim() || task.bikeSourceId.trim() || "Unknown bike";
}

function bikeName(task: DocumentTask): string {
  return task.bikeTitle?.trim() || "Unknown bike";
}

function order(task: DocumentTask): string {
  return task.orderNumber == null ? "Order unavailable" : `Order #${task.orderNumber}`;
}

function name(attestation: WorkshopAttestation): string {
  return `${attestation.firstName} ${attestation.lastName}`.trim();
}

function m1Mark(item: WorkshopTaskItem): string {
  return item.m1Outcome === "not_applicable" ? "[N/A]" : "[X]";
}

function m2Mark(item: WorkshopTaskItem): string {
  return item.m2Verifies && item.m1Outcome !== "not_applicable" ? "  M2 [X]" : "";
}

function checklistLine(item: WorkshopTaskItem): string {
  const psi = item.itemType === "tyre_pressure_psi" && item.m1Psi != null
    ? ` (${item.m1Psi} PSI)`
    : "";
  return `${m1Mark(item)} ${item.label}${psi}${m2Mark(item)}`;
}

export function buildM1PrintDocument(input: M1DocumentInput): string {
  return soap(
    [
      text(["1"], ' align="center" dw="true" dh="true"'),
      text([
        "RE-CHECK TAG",
        order(input.task),
        `Bike: ${bikeName(input.task)}`,
        `Stock ID: ${stockId(input.task)}`,
      ]),
      text([`Prepared by ${name(input.m1)}`, input.m1SignedAt]),
      '<feed line="3"/><cut type="feed"/>',
    ].join(""),
  );
}

export function buildM2PrintDocument(input: M2DocumentInput): string {
  const items = [...input.items]
    .filter((item) => item.stage === "preparation")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return soap(
    [
      text(["BIKE READY FOR PICKUP"], ' align="center"'),
      text([
        order(input.task),
        `Bike: ${bikeName(input.task)}`,
        `Stock ID: ${stockId(input.task)}`,
        "",
        "CHECKLIST",
      ]),
      text(items.map(checklistLine)),
      text([
        "",
        `Bike prepared by ${name(input.m1)}`,
        `Preparation time ${input.m1SignedAt}`,
        `Bike re-checked by ${name(input.m2)}`,
      ]),
      '<feed line="3"/><cut type="feed"/>',
    ].join(""),
  );
}

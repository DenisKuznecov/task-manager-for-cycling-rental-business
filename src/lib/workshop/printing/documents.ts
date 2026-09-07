import type {
  WorkshopAttestation,
  WorkshopTaskItem,
  WorkshopTaskListRow,
} from "../domain/index.ts";
import { EPOS_NAMESPACE } from "./epos.ts";
import {
  ECHELON_LOGO_HEIGHT,
  ECHELON_LOGO_RASTER_BASE64,
  ECHELON_LOGO_WIDTH,
} from "./logo.ts";

const SOAP_NAMESPACE = "http://schemas.xmlsoap.org/soap/envelope/";
const PAPER_COLUMNS = 48;
const M1_CHECKLIST_COLUMN_WIDTH = 5;
const M2_CHECKLIST_COLUMN_WIDTH = 3;
const CHECKLIST_COLUMN_GAP = 2;
const CHECKLIST_STATUS_WIDTH =
  M1_CHECKLIST_COLUMN_WIDTH + CHECKLIST_COLUMN_GAP + M2_CHECKLIST_COLUMN_WIDTH;

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

function normalizePrintableText(value: string): string {
  return value
    .replace(/[\u2032\u02B9]/g, "'")
    .replace(/[\u2033\u02BA]/g, '"')
    .replace(/[\u201C\u201D]/g, '"')
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
  for (const rawLine of normalizePrintableText(value).split("\n")) {
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
  return item.m2Verifies && item.m1Outcome !== "not_applicable" ? "[X]" : "";
}

function checklistText(item: WorkshopTaskItem): string {
  const psi = item.itemType === "tyre_pressure_psi" && item.m1Psi != null
    ? ` (${item.m1Psi} PSI)`
    : "";
  return `${item.label}${psi}`;
}

function wrapChecklistLine(item: WorkshopTaskItem): string[] {
  const status = `${m1Mark(item).padStart(M1_CHECKLIST_COLUMN_WIDTH)}${" ".repeat(CHECKLIST_COLUMN_GAP)}${m2Mark(item).padStart(M2_CHECKLIST_COLUMN_WIDTH)}`;
  const lines = wrapThermalText(checklistText(item), PAPER_COLUMNS - CHECKLIST_STATUS_WIDTH);
  const last = lines.pop() ?? "";
  return [...lines, `${last.padEnd(PAPER_COLUMNS - CHECKLIST_STATUS_WIDTH)}${status}`];
}

function checklistColumnHeader(): string {
  const m1 = "M1".padStart(4).padEnd(M1_CHECKLIST_COLUMN_WIDTH);
  const m2 = "M2".padStart(M2_CHECKLIST_COLUMN_WIDTH);
  return `${"".padEnd(PAPER_COLUMNS - CHECKLIST_STATUS_WIDTH)}${m1}${" ".repeat(CHECKLIST_COLUMN_GAP)}${m2}`;
}

export function buildM1PrintDocument(input: M1DocumentInput): string {
  return soap(
    [
      text(["RE-CHECK TAG"], ' align="center" width="3" height="3" dw="false" dh="false"'),
      text([
        order(input.task),
        `Bike: ${bikeName(input.task)}`,
        `Stock ID: ${stockId(input.task)}`,
      ], ' width="1" height="2" dw="false" dh="false"'),
      text(["Prepared by", name(input.m1), input.m1SignedAt], ' width="1" height="2" dw="false" dh="false"'),
      '<feed line="40"/><cut type="feed"/>',
    ].join(""),
  );
}

export function buildM2PrintDocument(input: M2DocumentInput): string {
  const items = [...input.items]
    .filter((item) => item.stage === "preparation")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.itemId.localeCompare(b.itemId));
  return soap(
    [
      `<image width="${ECHELON_LOGO_WIDTH}" height="${ECHELON_LOGO_HEIGHT}" align="center" color="color_1" mode="mono">${ECHELON_LOGO_RASTER_BASE64}</image>`,
      '<feed line="1"/>',
      text(["BIKE READY FOR PICKUP"], ' align="center" dw="true" dh="true"'),
      text([
        order(input.task),
        `Bike: ${bikeName(input.task)}`,
        "",
        "CHECKLIST",
      ], ' dw="false" dh="false"'),
      text([checklistColumnHeader(), ...items.flatMap(wrapChecklistLine)], ' align="left" dw="false" dh="false"'),
      text([
        "",
        `Bike prepared by ${name(input.m1)}`,
        `Bike re-checked by ${name(input.m2)}`,
        `Bike was prepared at ${input.m1SignedAt}`,
      ], ' dw="false" dh="false"'),
      '<feed line="3"/><cut type="feed"/>',
    ].join(""),
  );
}

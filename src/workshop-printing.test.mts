import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWorkshopPrinterConfig } from "./lib/workshop/printing/config.ts";
import {
  buildM1PrintDocument,
  buildM2PrintDocument,
  escapeXml,
  wrapThermalText,
} from "./lib/workshop/printing/documents.ts";
import {
  ECHELON_LOGO_HEIGHT,
  ECHELON_LOGO_RASTER_BASE64,
  ECHELON_LOGO_WIDTH,
  validateEchelonLogoRaster,
} from "./lib/workshop/printing/logo.ts";
import {
  classifyReply,
  createPrintAttemptGuard,
  EPOS_NAMESPACE,
  MAX_RESPONSE_BYTES,
  parseEposResponse,
  sendPrintAttempt,
  validateTarget,
} from "./lib/workshop/printing/epos.ts";
import { canPrintStage } from "./lib/workshop/printing/gates.ts";
import type {
  WorkshopAttestation,
  WorkshopTaskItem,
  WorkshopTaskListRow,
} from "./lib/workshop/domain/dtos.ts";

const target =
  "http://192.168.1.38/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000";

const task: Pick<
  WorkshopTaskListRow,
  "bikeDisplayId" | "bikeSourceId" | "bikeTitle" | "orderNumber"
> = {
  bikeDisplayId: "STOCK-01",
  bikeSourceId: "source-01",
  bikeTitle: "Echelon Road Pro",
  orderNumber: 42,
};
const m1: WorkshopAttestation = {
  id: "m1",
  stage: "m1",
  userId: "mechanic-1",
  firstName: "Ana",
  lastName: "Garcia",
  signedAt: "2026-09-07T10:20:00.000Z",
  samePersonConfirmed: false,
  addonFingerprint: "fingerprint",
};
const m2: WorkshopAttestation = {
  ...m1,
  id: "m2",
  stage: "m2",
  userId: "mechanic-2",
  firstName: "Bo",
  lastName: "Recheck",
};
const item = (overrides: Partial<WorkshopTaskItem> = {}): WorkshopTaskItem => ({
  itemId: "item-1",
  stage: "preparation",
  itemKey: "ROAD-01",
  sortOrder: 1,
  label: "Check brakes",
  itemType: "action",
  required: true,
  m2Verifies: true,
  naAllowed: false,
  m1Outcome: "completed",
  m1Psi: null,
  m2Confirmed: true,
  ...overrides,
});

type FixtureElement = {
  namespaceURI: string | null;
  localName: string;
  parentElement: FixtureElement | null;
  children: FixtureElement[];
  getAttribute(name: string): string | null;
};

function fixtureElement(
  namespaceURI: string | null,
  localName: string,
  attributes: Record<string, string> = {},
): FixtureElement {
  return {
    namespaceURI,
    localName,
    parentElement: null,
    children: [],
    getAttribute(name) {
      return attributes[name] ?? null;
    },
  };
}

const SOAP_NAMESPACE = "http://schemas.xmlsoap.org/soap/envelope/";
const responseFixtures = {
  standalone: `<response xmlns="${EPOS_NAMESPACE}" success="true" code="" status="251658262"/>`,
  soap: `<s:Envelope xmlns:s="${SOAP_NAMESPACE}"><s:Body><response xmlns="${EPOS_NAMESPACE}" success="1" code="OK" status="2"/></s:Body></s:Envelope>`,
  malformed: "<response",
  foreign: `<foreign><response xmlns="${EPOS_NAMESPACE}" success="true"/></foreign>`,
  multiple: `<s:Envelope xmlns:s="${SOAP_NAMESPACE}"><s:Body><response xmlns="${EPOS_NAMESPACE}" success="true"/><response xmlns="${EPOS_NAMESPACE}" success="true"/></s:Body></s:Envelope>`,
} as const;

/**
 * Node's native test runtime has no DOMParser. This double supplies only the
 * namespace, parent, child, and attribute relationships parseEposResponse
 * reads; the production parser still performs every structural decision.
 */
class FixtureDomParser {
  parseFromString(xml: string) {
    const parserError = fixtureElement(null, "parsererror");
    const unknownRoot = fixtureElement(null, "unknown");
    if (xml === responseFixtures.malformed) {
      return {
        doctype: null,
        documentElement: unknownRoot,
        getElementsByTagNameNS(namespace: string, localName: string) {
          return namespace === "*" && localName === "parsererror"
            ? [parserError]
            : [];
        },
      };
    }

    const response = (attributes: Record<string, string>) =>
      fixtureElement(EPOS_NAMESPACE, "response", attributes);
    const documentFor = (
      root: FixtureElement,
      responses: FixtureElement[],
    ) => ({
      doctype: null,
      documentElement: root,
      getElementsByTagNameNS(namespace: string, localName: string) {
        if (namespace === "*" && localName === "parsererror") return [];
        return namespace === EPOS_NAMESPACE && localName === "response"
          ? responses
          : [];
      },
    });

    if (xml === responseFixtures.standalone) {
      const reply = response({ success: "true", code: "", status: "251658262" });
      return documentFor(reply, [reply]);
    }
    if (xml === responseFixtures.soap) {
      const root = fixtureElement(SOAP_NAMESPACE, "Envelope");
      const body = fixtureElement(SOAP_NAMESPACE, "Body");
      const reply = response({ success: "1", code: "OK", status: "2" });
      root.children = [body];
      body.parentElement = root;
      body.children = [reply];
      reply.parentElement = body;
      return documentFor(root, [reply]);
    }
    if (xml === responseFixtures.foreign) {
      const root = fixtureElement("https://example.test/foreign", "foreign");
      const reply = response({ success: "true" });
      root.children = [reply];
      reply.parentElement = root;
      return documentFor(root, [reply]);
    }
    if (xml === responseFixtures.multiple) {
      const root = fixtureElement(SOAP_NAMESPACE, "Envelope");
      const body = fixtureElement(SOAP_NAMESPACE, "Body");
      const first = response({ success: "true" });
      const second = response({ success: "true" });
      root.children = [body];
      body.parentElement = root;
      body.children = [first, second];
      first.parentElement = body;
      second.parentElement = body;
      return documentFor(root, [first, second]);
    }
    throw new Error(`Unexpected XML fixture: ${xml}`);
  }
}

test("server printer configuration defaults to the approved ePOS target", () => {
  assert.deepEqual(resolveWorkshopPrinterConfig({}), { ok: true, target });
  assert.deepEqual(
    resolveWorkshopPrinterConfig({
      WORKSHOP_PRINTER_ADDRESS: "http://printer.local",
      WORKSHOP_PRINTER_DEVICE_ID: "workshop_1",
    }),
    {
      ok: true,
      target:
        "http://printer.local/cgi-bin/epos/service.cgi?devid=workshop_1&timeout=10000",
    },
  );
  assert.equal(
    resolveWorkshopPrinterConfig({ WORKSHOP_PRINTER_ADDRESS: "http://8.8.8.8" }).ok,
    false,
  );
  for (const environment of [
    { WORKSHOP_PRINTER_ADDRESS: "   " },
    { WORKSHOP_PRINTER_DEVICE_ID: "\t" },
  ]) {
    const result = resolveWorkshopPrinterConfig(environment);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /configuration is invalid/i);
  }
});

test("private printer targets are bounded and reject public or injected configuration", () => {
  assert.deepEqual(validateTarget("http://192.168.1.38", "local_printer"), {
    ok: true,
    target,
  });
  for (const address of [
    "",
    "192.168.1.38",
    "http://8.8.8.8",
    "http://user:password@192.168.1.38",
    "http://192.168.1.38/cgi-bin/epos/service.cgi",
    "http://192.168.1.38/?a=1",
    "http://192.168.01.38",
  ]) {
    assert.equal(validateTarget(address, "local_printer").ok, false, address);
  }
  assert.equal(validateTarget("http://192.168.1.38", "p&timeout=1").ok, false);
});

test("M1 uses RE-CHECK TAG as its sole enlarged cue and separates the preparer from the date", () => {
  const document = buildM1PrintDocument({
    task: { ...task, bikeTitle: "Focus Aventura2 6.7 - size L, 5′9″–6′3″" },
    m1,
    m1SignedAt: "7 Sep 2026, 12:20",
  });
  assert.match(
    document,
    /<text align="center" width="3" height="3" dw="false" dh="false">RE-CHECK TAG/,
  );
  assert.deepEqual(
    [...document.matchAll(/<text([^>]*)>/g)].map((match) => match[1]),
    [
      ' align="center" width="3" height="3" dw="false" dh="false"',
      ' width="1" height="2" dw="false" dh="false"',
      ' width="1" height="2" dw="false" dh="false"',
    ],
  );
  assert.doesNotMatch(document, /<text[^>]*>\s*1\n<\/text>/);
  assert.match(document, /Order #42/);
  assert.match(document, /Bike: Focus Aventura2 6\.7 - size L, 5&apos;9&quot;-6&apos;3&quot;/);
  assert.doesNotMatch(document, /5\?9|6\?3/);
  assert.match(document, /Stock ID: STOCK-01/);
  assert.match(document, /Prepared by\nAna Garcia\n7 Sep 2026, 12:20/);
  assert.match(document, /<feed line="40"\/><cut type="feed"\/>/);
  assert.match(document, /^[\x00-\x7F]*$/);
});

test("M2 starts with a validated centered one-bit logo and keeps sorted trailing-only checklist marks", () => {
  const document = buildM2PrintDocument({
    task,
    m1,
    m2,
    m1SignedAt: "7 Sep 2026, 12:20",
    items: [
      item({ itemId: "late", sortOrder: 3, label: "Late check", m2Verifies: false }),
      item({
        itemId: "psi",
        sortOrder: 2,
        label: "Front tyre <pressure>",
        itemType: "tyre_pressure_psi",
        m1Psi: 80,
      }),
      item({
        itemId: "na",
        sortOrder: 1,
        label: "Optional lights",
        m1Outcome: "not_applicable",
        m2Verifies: true,
      }),
      item({ itemId: "storage", stage: "storage", sortOrder: 0, label: "Do not print" }),
    ],
  });
  assert.doesNotThrow(validateEchelonLogoRaster);
  assert.equal(ECHELON_LOGO_WIDTH % 8, 0);
  assert.equal(
    Buffer.from(ECHELON_LOGO_RASTER_BASE64, "base64").length,
    (ECHELON_LOGO_WIDTH / 8) * ECHELON_LOGO_HEIGHT,
  );
  assert.ok(
    document.includes(
      `<image width="${ECHELON_LOGO_WIDTH}" height="${ECHELON_LOGO_HEIGHT}" align="center" color="color_1" mode="mono">${ECHELON_LOGO_RASTER_BASE64}</image><feed line="1"/><text align="center" dw="true" dh="true">BIKE READY FOR PICKUP`,
    ),
  );
  assert.deepEqual(
    [...document.matchAll(/<text([^>]*)>/g)].map((match) => match[1]),
    [
      ' align="center" dw="true" dh="true"',
      ' dw="false" dh="false"',
      ' align="left" dw="false" dh="false"',
      ' dw="false" dh="false"',
    ],
  );
  const checklistLines = ([...document.matchAll(/<text[^>]*>([\s\S]*?)\n<\/text>/g)][2]?.[1] ?? "").split("\n");
  assert.equal(checklistLines[0]?.length, 48);
  assert.match(checklistLines[0] ?? "", /M1 +M2$/);
  const optionalLights = checklistLines.find((line) => line.startsWith("Optional lights"));
  const lateCheck = checklistLines.find((line) => line.startsWith("Late check"));
  assert.equal(optionalLights?.length, 48);
  assert.match(optionalLights ?? "", /\[N\/A\] +$/);
  assert.equal(lateCheck?.length, 48);
  assert.match(lateCheck ?? "", /\[X\] +$/);
  assert.ok(document.indexOf("Optional lights") < document.indexOf("Front tyre"));
  assert.ok(document.indexOf("Front tyre") < document.indexOf("Late check"));
  assert.match(document, /Optional lights +\[N\/A\]/);
  assert.doesNotMatch(document, /\[N\/A\] Optional lights/);
  assert.doesNotMatch(document, /M2 \[X\]/);
  assert.match(document, /Front tyre &lt;pressure&gt; \(80 PSI\) +\[X\]  \[X\]/);
  assert.match(document, /Late check +\[X\]/);
  assert.doesNotMatch(document, /Late check \[X\]  M2 \[X\]/);
  assert.match(document, /Bike: Echelon Road Pro/);
  assert.doesNotMatch(document, /Stock ID:/);
  assert.match(document, /Bike prepared by Ana Garcia/);
  assert.match(document, /Bike re-checked by Bo Recheck/);
  assert.match(document, /Bike was prepared at 7 Sep 2026, 12:20/);
  assert.ok(document.indexOf("Bike prepared by") < document.indexOf("Bike re-checked by"));
  assert.ok(document.indexOf("Bike re-checked by") < document.indexOf("Bike was prepared at"));
});

test("logo validation rejects malformed, wrong-sized, and blank candidates", () => {
  assert.throws(
    () => validateEchelonLogoRaster({ width: 8, height: 1, base64: "not-base64" }),
    /valid Base64/i,
  );
  assert.throws(
    () => validateEchelonLogoRaster({ width: 8, height: 2, base64: "AA==" }),
    /declared geometry/i,
  );
  assert.throws(
    () => validateEchelonLogoRaster({ width: 8, height: 1, base64: "AA==" }),
    /black pixel/i,
  );
});

test("M2 checklist wrapping keeps its complete status suffix with the final label line", () => {
  const longLabel = "Inspect chain and derailleur alignment ".repeat(4).trim();
  const document = buildM2PrintDocument({
    task,
    m1,
    m2,
    m1SignedAt: "7 Sep 2026, 12:20",
    items: [item({ label: longLabel })],
  });
  const textBlocks = [...document.matchAll(/<text([^>]*)>([\s\S]*?)\n<\/text>/g)];
  assert.equal(textBlocks[2]?.[1], ' align="left" dw="false" dh="false"');
  const checklistLines = (textBlocks[2]?.[2] ?? "").split("\n");
  assert.ok(checklistLines.every((line) => line.length <= 48));
  assert.equal(checklistLines.filter((line) => /\[X\]/.test(line)).length, 1);
  assert.match(checklistLines.at(-1) ?? "", /.+ +\[X\]  \[X\]$/);
  assert.equal(checklistLines.at(-1)?.length, 48);
  assert.ok(
    checklistLines.every((line) => !/^(?:\[X\]|\[N\/A\])/.test(line.trim())),
  );
});

test("M2 uses item IDs as the deterministic tie-breaker for equal sort orders", () => {
  const document = buildM2PrintDocument({
    task,
    m1,
    m2,
    m1SignedAt: "7 Sep 2026, 12:20",
    items: [
      item({ itemId: "z-item", sortOrder: 1, label: "Zulu item" }),
      item({ itemId: "a-item", sortOrder: 1, label: "Alpha item" }),
    ],
  });
  assert.ok(document.indexOf("Alpha item") < document.indexOf("Zulu item"));
});

test("thermal text converts curly double quotes before the ASCII fallback", () => {
  assert.deepEqual(wrapThermalText("“Ready” at 5′9″"), ['"Ready" at 5\'9"']);
});

test("documents label the fallback source ID separately from the bike name", () => {
  const fallbackTask = {
    ...task,
    bikeDisplayId: null,
    bikeSourceId: "source-fallback-9",
    bikeTitle: "Echelon City",
  };
  const m1Document = buildM1PrintDocument({
    task: fallbackTask,
    m1,
    m1SignedAt: "7 Sep 2026, 12:20",
  });
  const m2Document = buildM2PrintDocument({
    task: fallbackTask,
    m1,
    m2,
    m1SignedAt: "7 Sep 2026, 12:20",
    items: [item()],
  });
  assert.match(m1Document, /Bike: Echelon City/);
  assert.match(m1Document, /Stock ID: source-fallback-9/);
  assert.match(m2Document, /Bike: Echelon City/);
  assert.doesNotMatch(m2Document, /Stock ID:/);
});

test("XML-sensitive and long content is escaped, ASCII-safe and never truncated", () => {
  assert.equal(escapeXml("<&>\"'"), "&lt;&amp;&gt;&quot;&apos;");
  const source = `A & <tag> ${"very-long-value-".repeat(8)} cafe`;
  const lines = wrapThermalText(source);
  assert.ok(lines.every((line) => line.length <= 48));
  assert.equal(lines.join(""), source);
  const document = buildM2PrintDocument({
    task: { ...task, bikeTitle: "A & <bike> cafe" },
    m1,
    m2,
    m1SignedAt: "7 Sep 2026, 12:20",
    items: [item({ label: source })],
  });
  assert.match(document, /A &amp; &lt;bike&gt; cafe/);
  assert.match(document, /&amp; &lt;tag&gt;/);
  assert.match(document, /^[\x00-\x7F]*$/);
});

test("thermal wrapping rejects non-positive and fractional widths before iterating", () => {
  for (const columns of [0, -1, 1.5]) {
    assert.throws(
      () => wrapThermalText("long enough to require wrapping", columns),
      /positive integer/i,
    );
  }
});

test("persisted attestations gate prints, preserve reprints, and retire on cancellation", () => {
  assert.equal(canPrintStage("being_prepared", "m1", undefined, undefined), false);
  assert.equal(canPrintStage("needs_recheck", "m1", m1, undefined), true);
  assert.equal(canPrintStage("needs_recheck", "m2", m1, undefined), false);
  assert.equal(canPrintStage("ready_for_pickup", "m1", m1, m2), true);
  assert.equal(canPrintStage("completed", "m2", m1, m2), true);
  assert.equal(canPrintStage("cancelled", "m1", m1, m2), false);
  assert.equal(canPrintStage("cancelled", "m2", m1, m2), false);
  assert.equal(canPrintStage("ready_for_pickup", "m2", m1, { ...m2, signedAt: "bad" }), false);
});

test("classification distinguishes a negative Epson reply from unknown delivery", () => {
  assert.equal(classifyReply("true", "", "123").outcome, "acknowledged");
  assert.equal(classifyReply("false", "EPTR_COVER_OPEN", "456").outcome, "failed");
  const timeout = classifyReply("false", "EX_TIMEOUT", "1");
  assert.equal(timeout.outcome, "unknown");
  assert.match(timeout.message, /check the paper before an explicit next attempt/i);
});

test("production Epson parser accepts standalone and SOAP replies, but rejects malformed or structurally foreign replies", () => {
  const globalWithParser = globalThis as typeof globalThis & {
    DOMParser?: typeof DOMParser;
  };
  const originalDomParser = globalWithParser.DOMParser;
  globalWithParser.DOMParser = FixtureDomParser as unknown as typeof DOMParser;
  try {
    const standalone = parseEposResponse(responseFixtures.standalone);
    assert.equal(standalone.outcome, "acknowledged");
    assert.equal(standalone.status, "251658262");

    const soap = parseEposResponse(responseFixtures.soap);
    assert.equal(soap.outcome, "acknowledged");
    assert.equal(soap.code, "OK");

    for (const xml of [
      responseFixtures.malformed,
      responseFixtures.foreign,
      responseFixtures.multiple,
    ]) {
      assert.equal(parseEposResponse(xml).outcome, "unknown");
    }
  } finally {
    if (originalDomParser) {
      globalWithParser.DOMParser = originalDomParser;
    } else {
      delete globalWithParser.DOMParser;
    }
  }
});

test("one credential-free SOAP POST is sent, never retried, and carries the document", async () => {
  const document = buildM1PrintDocument({ task, m1, m1SignedAt: "7 Sep 2026, 12:20" });
  let calls = 0;
  const result = await sendPrintAttempt(target, document, {
    fetchImpl: async (url, init) => {
      calls++;
      assert.equal(url, target);
      assert.equal(init?.method, "POST");
      assert.equal(init?.mode, "cors");
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.deepEqual(init?.headers, {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '\"\"',
      });
      assert.equal(init?.body, document);
      return new Response("mocked", { status: 200 });
    },
    parseReply: () => classifyReply("true", "", "123"),
  });
  assert.equal(calls, 1);
  assert.equal(result.outcome, "acknowledged");
});

test("network, timeout and oversized response remain unknown and never retry", async () => {
  let networkCalls = 0;
  const network = await sendPrintAttempt(target, "<document/>", {
    fetchImpl: async () => {
      networkCalls++;
      throw new TypeError("Failed to fetch");
    },
  });
  assert.equal(networkCalls, 1);
  assert.equal(network.outcome, "unknown");

  let signal: AbortSignal | undefined;
  const timeout = await sendPrintAttempt(target, "<document/>", {
    timeoutMs: 10,
    fetchImpl: async (_url, init) => {
      signal = init?.signal;
      return new Promise(() => {});
    },
  });
  assert.equal(signal?.aborted, true);
  assert.equal(timeout.outcome, "unknown");

  const oversized = await sendPrintAttempt(target, "<document/>", {
    fetchImpl: async () => new Response("a".repeat(MAX_RESPONSE_BYTES + 1)),
  });
  assert.equal(oversized.outcome, "unknown");
  assert.match(oversized.message, /64 KiB/);
});

test("synchronous duplicate guard admits one in-flight job and an explicit later retry", () => {
  const guard = createPrintAttemptGuard();
  assert.equal(guard.claim(), true);
  assert.equal(guard.claim(), false);
  guard.release();
  assert.equal(guard.claim(), true);
  guard.release();
});

test("documents use the Epson namespace", () => {
  assert.match(buildM1PrintDocument({ task, m1, m1SignedAt: "now" }), new RegExp(EPOS_NAMESPACE));
});

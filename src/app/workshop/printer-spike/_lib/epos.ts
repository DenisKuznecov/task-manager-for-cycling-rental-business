export const EPOS_NAMESPACE = "http://www.epson-pos.com/schemas/2011/03/epos-print";
const SOAP_NAMESPACE = "http://schemas.xmlsoap.org/soap/envelope/";
export const PRINTER_TIMEOUT_MS = 10_000;
export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_RESPONSE_BYTES = 64 * 1024;

export type Operation = "connection" | "print";
export type Outcome = "acknowledged" | "failed" | "unknown";
export type EposReply = {
  outcome: Outcome;
  code: string | null;
  status: string | null;
  message: string;
};
export type Attempt = EposReply & {
  target: string;
  operation: Operation;
  httpStatus: number | null;
  elapsedMs: number;
  rawResponse: string;
};
export type TargetValidation =
  | { ok: true; target: string }
  | { ok: false; error: string };

export function validateTarget(address: string, deviceId: string): TargetValidation {
  // Validate the original spelling before URL normalizes shorthand IPv4,
  // backslashes, dot segments, credentials or escaped hostname characters.
  const origin = address.trim();
  const match = /^https?:\/\/([a-zA-Z0-9.-]+)(?::([0-9]{1,5}))?\/?$/.exec(origin);
  if (!match) {
    return { ok: false, error: "Enter an HTTP(S) origin with a private IPv4 or .local hostname, without credentials, path, query or fragment." };
  }
  const host = match[1].toLowerCase();
  const octets = host.split(".");
  const ipv4 = octets.length === 4 && octets.every((part) => /^(0|[1-9][0-9]{0,2})$/.test(part) && Number(part) <= 255);
  const [first, second] = octets.map(Number);
  const privateIp = ipv4 && (first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168));
  const localHost = host.endsWith(".local") && host.length <= 253 && octets.length >= 2 && octets.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  if (!privateIp && !localHost) {
    return { ok: false, error: "Use a private IPv4 address (10.x.x.x, 172.16–31.x.x or 192.168.x.x) or a .local hostname." };
  }
  if (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 65535)) {
    return { ok: false, error: "The HTTP(S) port must be between 1 and 65535." };
  }
  if (!/^[a-zA-Z0-9_-]{1,30}$/.test(deviceId)) {
    return { ok: false, error: "Use a device ID of 1–30 ASCII letters, numbers, underscores or hyphens." };
  }
  const url = new URL("/cgi-bin/epos/service.cgi", origin);
  url.searchParams.set("devid", deviceId);
  url.searchParams.set("timeout", String(PRINTER_TIMEOUT_MS));
  return { ok: true, target: url.href };
}

export function buildSoap(operation: Operation): string {
  const receipt = operation === "print"
    ? '<text>ECHELON PRINTER TEST\nDIAGNOSTIC ONLY - NOT A WORKSHOP TASK\nTM-m30III direct browser spike\nNo customer or bike data\nInspect this paper and the cut.\n</text><cut type="feed"/>'
    : "";
  return `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="${SOAP_NAMESPACE}"><s:Body><epos-print xmlns="${EPOS_NAMESPACE}">${receipt}</epos-print></s:Body></s:Envelope>`;
}

function unknown(message: string): EposReply {
  return { outcome: "unknown", code: null, status: null, message };
}

// Kept separate from XML parsing so native Node tests never imitate a DOM parser.
export function classifyReply(success: string | null, code: string | null, status: string | null): EposReply {
  if (success === "true" || success === "1") {
    return { outcome: "acknowledged", code, status, message: "Epson acknowledged the request. This does not prove physical output; inspect the printer and paper." };
  }
  if (success === "false" || success === "0") {
    return { outcome: "failed", code, status, message: `Epson reported failure${code ? ` (${code})` : ""}. Inspect the printer before an explicit next attempt.` };
  }
  return { ...unknown("The Epson reply has no recognized success value. Check the paper before reprinting."), code, status };
}

export function parseEposResponse(xml: string): EposReply {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagNameNS("*", "parsererror").length || doc.doctype) {
    return unknown("Malformed or unsupported XML response. Check the paper before reprinting.");
  }
  const root = doc.documentElement;
  const replies = doc.getElementsByTagNameNS(EPOS_NAMESPACE, "response");
  if (replies.length !== 1) {
    return unknown("No unique Epson response was found. Check the paper before reprinting.");
  }
  const reply = replies[0];
  const body = reply.parentElement;
  const standalone = root === reply;
  const soap = root.namespaceURI === SOAP_NAMESPACE && root.localName === "Envelope" &&
    body?.namespaceURI === SOAP_NAMESPACE && body.localName === "Body" && body.parentElement === root &&
    body.children.length === 1;
  if (!standalone && !soap) {
    return unknown("The response is not an Epson reply or SOAP receipt response. Check the paper before reprinting.");
  }
  return classifyReply(reply.getAttribute("success"), reply.getAttribute("code"), reply.getAttribute("status"));
}

type AttemptOptions = {
  fetchImpl?: typeof fetch;
  parseReply?: (xml: string) => EposReply;
  timeoutMs?: number;
};

export async function sendAttempt(target: string, operation: Operation, options: AttemptOptions = {}): Promise<Attempt> {
  const started = performance.now();
  const controller = new AbortController();
  let httpStatus: number | null = null;
  let rawResponse = "";
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error("Request timed out"));
    }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  });
  const request = async (): Promise<EposReply> => {
    const response = await (options.fetchImpl ?? fetch)(target, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""' },
      body: buildSoap(operation),
      signal: controller.signal,
    });
    httpStatus = response.status;
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) {
            controller.abort();
            throw new Error("Response exceeded the 64 KiB diagnostic limit (displayed response is partial)");
          }
          rawResponse += decoder.decode(chunk.value, { stream: true });
        }
        rawResponse += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    }
    if (!response.ok) return unknown(`HTTP ${response.status}; delivery is unknown. Check the paper before reprinting.`);
    return (options.parseReply ?? parseEposResponse)(rawResponse);
  };
  let reply: EposReply;
  try {
    reply = await Promise.race([request(), timeout]);
  } catch (error) {
    const detail = timedOut ? "Request timed out" : error instanceof Error ? error.message : String(error);
    console.error("printer-spike:", error);
    reply = unknown(`${detail}. Delivery is unknown. Browser failures may involve network, permissions, TLS or CORS. Check the paper before reprinting.`);
  } finally {
    clearTimeout(timer);
  }
  return { ...reply, target, operation, httpStatus, elapsedMs: Math.round(performance.now() - started), rawResponse };
}

// Claim synchronously before React can render a disabled button.
export function createAttemptGuard() {
  let pending = false;
  return {
    claim() {
      if (pending) return false;
      pending = true;
      return true;
    },
    release() { pending = false; },
  };
}

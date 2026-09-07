import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSoap,
  classifyReply,
  createAttemptGuard,
  EPOS_NAMESPACE,
  MAX_RESPONSE_BYTES,
  sendAttempt,
  validateTarget,
} from "./app/workshop/printer-spike/_lib/epos.ts";

const target = "http://192.168.1.38/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000";
const acknowledged = () => classifyReply("true", "", "251658262");

test("private IPv4 and .local origins produce the documented endpoint", () => {
  assert.deepEqual(validateTarget("http://192.168.1.38", "local_printer"), { ok: true, target });
  for (const host of ["10.1.2.3", "172.16.0.1", "172.31.255.254", "printer.local", "shop.printer.local"]) {
    assert.equal(validateTarget(`https://${host}/`, "printer_1").ok, true, host);
  }
  assert.equal(validateTarget("http://printer.local:8080", "printer-1").ok, true);
});

test("invalid, public, credentialed, pathful and normalized-away addresses are rejected", () => {
  for (const address of ["", "192.168.1.38", "http://8.8.8.8", "http://127.0.0.1", "http://169.254.1.2", "http://172.15.1.1", "http://172.32.1.1", "http://192.169.1.1", "http://192.168.1.256", "http://user:password@192.168.1.38", "http://192.168.1.38/cgi-bin/epos/service.cgi", "http://192.168.1.38/a/..", "http://192.168.1.38/?a=1", "http://192.168.1.38/#", "http://192.168.1.38\\", "http://3232235814", "http://0xc0a80126", "http://192.168.01.38", "http://printer.local.evil.example", "http://.local", "http://-bad.local", "http://printer..local", "http://printer.local:0", "http://printer.local:65536", "ftp://printer.local", "http://[::1]"]) {
    assert.equal(validateTarget(address, "local_printer").ok, false, address);
  }
});

test("device IDs reject URL or XML injection and blank/oversize values", () => {
  for (const id of ["", " local_printer", "printer name", "p&timeout=1", '<xml/>', "a".repeat(31)]) {
    assert.equal(validateTarget("http://192.168.1.38", id).ok, false, id);
  }
});

test("connection sends empty ePOS; print sends fixed ASCII label with feed cut", () => {
  const connection = buildSoap("connection");
  assert.ok(connection.includes(`<epos-print xmlns="${EPOS_NAMESPACE}"></epos-print>`));
  assert.ok(connection.includes('xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"'));
  assert.ok(!connection.includes("<cut"));
  assert.ok(!connection.includes("<text"));
  const print = buildSoap("print");
  assert.ok(print.includes("ECHELON PRINTER TEST"));
  assert.ok(print.includes("DIAGNOSTIC ONLY - NOT A WORKSHOP TASK"));
  assert.ok(print.includes('<cut type="feed"/>'));
  assert.match(print, /^[\x00-\x7F]*$/);
});

test("classification accepts XML boolean spellings and preserves device errors", () => {
  for (const success of ["true", "1"]) assert.equal(classifyReply(success, "", "123").outcome, "acknowledged");
  for (const success of ["false", "0"]) {
    const reply = classifyReply(success, "EPTR_COVER_OPEN", "456");
    assert.equal(reply.outcome, "failed");
    assert.equal(reply.code, "EPTR_COVER_OPEN");
    assert.equal(reply.status, "456");
    assert.match(reply.message, /EPTR_COVER_OPEN/);
  }
  for (const success of [null, "", "TRUE", "yes"]) assert.equal(classifyReply(success, null, null).outcome, "unknown");
});

test("fetch contract: exactly one credential-free CORS SOAP POST, no redirects or retries", async () => {
  let calls = 0;
  const result = await sendAttempt(target, "print", {
    fetchImpl: async (url, init) => {
      calls++;
      assert.equal(url, target);
      assert.equal(init?.method, "POST");
      assert.equal(init?.mode, "cors");
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.referrerPolicy, "no-referrer");
      assert.equal(init?.cache, "no-store");
      assert.deepEqual(init?.headers, { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""' });
      assert.equal(init?.body, buildSoap("print"));
      assert.ok(init?.signal instanceof AbortSignal);
      return new Response("explicit mocked reply", { status: 200 });
    },
    // This is an injected classifier, deliberately not an imitation XML parser.
    // Real DOMParser verification is performed in the authenticated browser.
    parseReply: (xml) => { assert.equal(xml, "explicit mocked reply"); return acknowledged(); },
  });
  assert.equal(calls, 1);
  assert.equal(result.outcome, "acknowledged");
  assert.equal(result.httpStatus, 200);
  assert.equal(result.target, target);
  assert.equal(result.operation, "print");
  assert.ok(result.elapsedMs >= 0);
  assert.equal(result.rawResponse, "explicit mocked reply");
});

test("HTTP error remains unknown even when body claims success", async () => {
  let parsed = false;
  const result = await sendAttempt(target, "connection", {
    fetchImpl: async () => new Response("claimed success", { status: 503 }),
    parseReply: () => { parsed = true; return acknowledged(); },
  });
  assert.equal(result.outcome, "unknown");
  assert.equal(result.httpStatus, 503);
  assert.equal(result.rawResponse, "claimed success");
  assert.equal(parsed, false);
});

test("network rejection yields unknown delivery and never retries", async () => {
  let calls = 0;
  const result = await sendAttempt(target, "print", {
    fetchImpl: async () => { calls++; throw new TypeError("Failed to fetch"); },
  });
  assert.equal(calls, 1);
  assert.equal(result.outcome, "unknown");
  assert.equal(result.httpStatus, null);
  assert.match(result.message, /Failed to fetch/);
  assert.match(result.message, /Check the paper before reprinting/);
});

test("timeout bounds the request and aborts without retry", async () => {
  let signal: AbortSignal | null | undefined;
  let calls = 0;
  const result = await sendAttempt(target, "print", {
    timeoutMs: 10,
    fetchImpl: async (_url, init) => { calls++; signal = init?.signal; return new Promise(() => {}); },
  });
  assert.equal(calls, 1);
  assert.equal(signal?.aborted, true);
  assert.equal(result.outcome, "unknown");
  assert.match(result.message, /timed out/);
});

test("timeout includes stalled body reading after HTTP headers", async () => {
  const result = await sendAttempt(target, "print", {
    timeoutMs: 10,
    fetchImpl: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("partial")); } })),
  });
  assert.equal(result.outcome, "unknown");
  assert.equal(result.httpStatus, 200);
  assert.equal(result.rawResponse, "partial");
  assert.match(result.message, /timed out/);
});

test("oversized body yields unknown delivery and skips XML parsing", async () => {
  let parsed = false;
  const result = await sendAttempt(target, "print", {
    fetchImpl: async () => new Response("a".repeat(MAX_RESPONSE_BYTES + 1)),
    parseReply: () => { parsed = true; return acknowledged(); },
  });
  assert.equal(result.outcome, "unknown");
  assert.match(result.message, /64 KiB/);
  assert.equal(parsed, false);
});

test("synchronous guard admits only one outstanding attempt and permits explicit retry", async () => {
  const guard = createAttemptGuard();
  let calls = 0;
  let finish: (() => void) | undefined;
  const first = async () => {
    if (!guard.claim()) return;
    try {
      calls++;
      await new Promise<void>((resolve) => { finish = resolve; });
    } finally { guard.release(); }
  };
  const pending = first();
  await first();
  assert.equal(calls, 1);
  finish?.();
  await pending;
  assert.equal(guard.claim(), true);
  assert.equal(guard.claim(), false);
  guard.release();
});

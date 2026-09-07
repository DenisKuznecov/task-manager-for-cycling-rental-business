"use client";

import { useRef, useState } from "react";
import { Alert } from "@/ui/components/Alert";
import { Button } from "@/ui/components/Button";
import { TextField } from "@/ui/components/TextField";
import { createAttemptGuard, sendAttempt, validateTarget, type Attempt, type Operation } from "../_lib/epos";

export function PrinterSpike() {
  const [address, setAddress] = useState("http://192.168.1.38");
  const [deviceId, setDeviceId] = useState("local_printer");
  const [pending, setPending] = useState<Operation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const guard = useRef(createAttemptGuard());
  const validation = validateTarget(address, deviceId);

  async function run(operation: Operation) {
    if (!guard.current.claim()) return;
    try {
      const target = validateTarget(address, deviceId);
      if (!target.ok) {
        setError(target.error);
        return;
      }
      setError(null);
      setAttempt(null);
      setPending(operation);
      setAttempt(await sendAttempt(target.target, operation));
    } finally {
      setPending(null);
      guard.current.release();
    }
  }

  return (
    <div className="container flex w-full max-w-3xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-1 font-heading-1">Epson printer spike</h1>
        <p className="text-body text-subtext-color">Direct browser diagnostic for the TM-m30III. Connection checks send no text or cut. The test receipt contains only a fixed ASCII diagnostic label.</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void run("connection"); }}>
        <TextField label="Printer base address" className="w-full" disabled={pending !== null}>
          <TextField.Input aria-label="Printer base address" value={address} disabled={pending !== null} onChange={(event) => setAddress(event.target.value)} autoComplete="off" spellCheck={false} />
        </TextField>
        <TextField label="Device ID" className="w-full" disabled={pending !== null}>
          <TextField.Input aria-label="Device ID" value={deviceId} disabled={pending !== null} onChange={(event) => setDeviceId(event.target.value)} autoComplete="off" spellCheck={false} />
        </TextField>
        <div className="break-all text-caption text-subtext-color">
          <span className="font-caption-bold">Request target: </span>{validation.ok ? validation.target : "Enter a valid printer address and device ID."}
        </div>
        {error ? <Alert role="alert" variant="error" title="No request sent" description={error} /> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="neutral-secondary" disabled={pending !== null} loading={pending === "connection"}>Test connection</Button>
          <Button disabled={pending !== null} loading={pending === "print"} onClick={() => { void run("print"); }}>Print test receipt</Button>
        </div>
      </form>
      <p className="text-caption text-subtext-color">One request per click, with a 15-second browser timeout and no automatic retries. If delivery is unknown, check the paper before trying again. Use the printer&apos;s HTTP(S) service address; browser permissions, CORS and TLS can affect access.</p>
      <div aria-live="polite" className="flex flex-col gap-4">
        {pending ? <p className="text-body">{pending === "print" ? "Sending test receipt…" : "Checking connection…"}</p> : null}
        {attempt ? (
          <>
            <Alert
              variant={attempt.outcome === "acknowledged" ? "success" : attempt.outcome === "failed" ? "error" : "warning"}
              title={attempt.outcome === "acknowledged" ? "Acknowledged by Epson" : attempt.outcome === "failed" ? "Epson reported failure" : "Delivery unknown"}
              description={attempt.message}
            />
            <details className="rounded-md border border-neutral-border p-4">
              <summary className="cursor-pointer text-body-bold">Attempt diagnostics</summary>
              <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-caption">
                <dt>Target</dt><dd className="break-all">{attempt.target}</dd>
                <dt>Operation</dt><dd>{attempt.operation === "print" ? "Print test receipt" : "Test connection (empty ePOS data)"}</dd>
                <dt>Outcome</dt><dd>{attempt.outcome}</dd>
                <dt>HTTP status</dt><dd>{attempt.httpStatus ?? "Unavailable"}</dd>
                <dt>Elapsed</dt><dd>{attempt.elapsedMs} ms</dd>
                <dt>Epson code</dt><dd>{attempt.code === "" ? "(empty)" : attempt.code ?? "Unavailable"}</dd>
                <dt>Epson status</dt><dd>{attempt.status ?? "Unavailable"}</dd>
              </dl>
              <p className="mt-4 text-caption-bold">Raw response</p>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-neutral-50 p-3 text-caption">{attempt.rawResponse || "No readable response body."}</pre>
            </details>
          </>
        ) : null}
      </div>
    </div>
  );
}

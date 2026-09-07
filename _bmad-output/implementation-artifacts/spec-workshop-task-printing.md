---
title: 'Print workshop task handoff papers'
type: 'feature'
created: '2026-09-07'
status: 'done'
baseline_commit: d3e393ec288223821ecdfb35fbf53c7e355a628d
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Checklist state is visible only in the app. Mechanics need an M1 paper that marks a bike for re-check and an M2 customer sheet showing the verified work and readiness for pickup.

**Approach:** Move the proven TM-m30III browser transport into the task page, generate both thermal documents, and unlock each action from its persisted attestation. Retire the spike UI; printing stays separate from task transitions and creates no app state.

## Boundaries & Constraints

**Always:** Use browser-to-printer Epson ePOS with deployment configuration defaulting to `http://192.168.1.38` / `local_printer`; one tap, no preview or selection; gate on persisted attestations; keep reprints in later non-cancelled states; escape XML; use ASCII-safe marks; distinguish failed from unknown delivery; never retry or block task commands.

**Ask First:** A real production-content print, deployment, printer/network/firmware changes, or another transport.

**Never:** Database/RPC/server-action changes, print history or paper lifecycle state, automatic printing, customer data, OS dialogs, Bluetooth/QZ/bridges, another diagnostic route, or a logo in this release.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Before completion | Required attestation absent | Relevant button is disabled | No request |
| M1 completed | M1 attestation exists | Large `1`, order, bike, stock ID, feed/cut | Failure leaves task unchanged |
| M2 completed | Both attestations exist | Sorted checklist, M1/applicable-M2 marks, PSI/N/A, names, M1 time, feed/cut | Missing signed data disables printing |
| Reprint / cancelled | Later status / tombstone | Unlocked actions persist / no print actions | No paper state |
| Busy | One request pending | Both buttons disabled; second activation ignored | Explicit retry after settlement |
| Failure | Invalid config, Epson/HTTP/timeout/CORS/TLS/network/XML problem | Error or check-paper warning | No retry; task actions remain usable |
| Special content | Long or XML-sensitive text | Escaped, wrapped 80 mm/48-column output with ASCII marks | No truncated item |

</frozen-after-approval>

## Code Map

- `src/app/workshop/_components/WorkshopTask.tsx:403-428,518-655` -- items/attestations and persistent insertion point outside status branches and tombstone.
- `src/app/workshop/[taskId]/page.tsx:8-36` -- pass server-resolved printer configuration without changing loader errors.
- `src/lib/workshop/domain/dtos.ts:11-64` -- all required bike, checklist, signer, and time data already exists; no loader or DB change.
- `src/app/workshop/_components/workshop-ui.ts:21-36,236-255,273-278` -- stock-ID fallback, checklist semantics, Madrid time.
- `src/app/workshop/printer-spike/_lib/epos.ts:26-187` -- extract target, response, timeout, bounded fetch, and duplicate guard; remove the spike route afterward.
- `src/printer-spike.test.mts`, `src/workshop-ui.test.mts` -- preserve transport coverage and add document/gating/reprint matrices under production naming.
- `_bmad-output/implementation-artifacts/printer-spike-evidence.md:20-37,54-61` -- successful print/cut evidence; deployed Windows remains implementation acceptance, not another spike.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/workshop/printing/{config,epos,documents}.ts` -- extract ePOS, resolve server-provided configuration, and build escaped 80 mm M1/M2 SOAP documents.
- [x] `src/app/workshop/_components/WorkshopPrintActions.tsx` -- implement attestation gates, local request/result state, duplicate guard, persistent buttons, and failure/unknown alerts.
- [x] `src/app/workshop/_components/WorkshopTask.tsx`, `src/app/workshop/[taskId]/page.tsx` -- integrate printing without coupling it to mutations or status branches.
- [x] `src/app/workshop/printer-spike/**` -- remove the completed diagnostic surface after extraction.
- [x] `src/workshop-printing.test.mts`, `src/workshop-ui.test.mts`, `package.json` -- rename/preserve transport tests and cover payloads, escaping, wrapping, status gates, M2 applicability, failures, no retry, and no command coupling.

**Acceptance Criteria:**
- Given saved M1 completion, when M1 print is pressed once, then one identified re-check tag is sent and remains reprintable later.
- Given saved M2 completion, when M2 print is pressed once, then the complete checklist and accountability lines are sent in order and remain reprintable.
- Given no relevant attestation, cancellation, unsaved work, or an in-flight print, when printing is attempted, then no misleading or duplicate job is sent.
- Given any outcome, when the request settles, then task state is unchanged; failure is visible and unknown delivery says to inspect paper before retrying.

## Spec Change Log

## Design Notes

Print `bikeDisplayId` as stock ID, falling back to `bikeSourceId`. M2 includes every preparation row: M1 `[X]`/`[N/A]`; M2 `[X]` only where `isM2RecheckItem` applies; PSI beside tyre rows. M1 supplies preparer/time and M2 supplies re-checker. “Sent to printer” never claims physical output.

## Verification

**Commands:**
- `npm run test:workshop-printing` -- expected: document, transport, gating, timeout, no-retry, and reprint cases pass without contacting the printer.
- `npm run test:workshop-ui` -- expected: existing workshop suite plus print integration locks pass.
- `npx tsc --noEmit` -- expected: application type-check passes.
- `npx eslint src/app/workshop src/lib/workshop/printing src/workshop-printing.test.mts --no-warn-ignored` -- expected: no errors.
- `git diff --check` -- expected: no whitespace errors.

**Manual checks:**
- With explicit approval, send one M1 and one longest M2 job from deployed Windows/Chrome; confirm Local Network Access, legibility, final line, and cut.

## Suggested Review Order

**Workshop action and task isolation**

- Persist printing independently of task commands while preventing duplicate in-flight jobs.
  [`WorkshopPrintActions.tsx:48`](../../src/app/workshop/_components/WorkshopPrintActions.tsx#L48)

- Bind persistent, attestation-gated actions without changing task-state transitions.
  [`WorkshopPrintActions.tsx:82`](../../src/app/workshop/_components/WorkshopPrintActions.tsx#L82)

- Resolve validated deployment configuration server-side before entering the task surface.
  [`page.tsx:34`](../../src/app/workshop/[taskId]/page.tsx#L34)

**Browser-to-printer boundary**

- Restrict printer targets to configured private origins and a safe ePOS endpoint.
  [`epos.ts:24`](../../src/lib/workshop/printing/epos.ts#L24)

- Send exactly one bounded browser request and distinguish unknown delivery from failure.
  [`epos.ts:159`](../../src/lib/workshop/printing/epos.ts#L159)

- Parse only structurally valid Epson replies before reporting a delivery outcome.
  [`epos.ts:119`](../../src/lib/workshop/printing/epos.ts#L119)

**Paper content and configuration**

- Build 48-column, XML-escaped M1/M2 papers from existing task state only.
  [`documents.ts:111`](../../src/lib/workshop/printing/documents.ts#L111)

- Fail safely on malformed printer configuration instead of silently targeting defaults.
  [`config.ts:11`](../../src/lib/workshop/printing/config.ts#L11)

**Verification**

- Exercise documents, gates, parser outcomes, bounded transport, and retry protection.
  [`workshop-printing.test.mts:179`](../../src/workshop-printing.test.mts#L179)

- Lock the task integration outside mutation commands and retire the diagnostic route.
  [`workshop-ui.test.mts:1001`](../../src/workshop-ui.test.mts#L1001)

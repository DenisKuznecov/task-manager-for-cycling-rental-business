# Printer spike handover — 7 September 2026

## Resume here

The user requested a commit and handover to a new chat. This is an **in-progress technical spike checkpoint**, not a finished production integration. Branch: `feature/checklist-printing`; original implementation baseline: `9014b649d682470a10810d706932bd9a3f5a17f2`.

Read `spec-epson-printer-spike.md` and `printer-spike-evidence.md` in this directory first. The research is under `../planning-artifacts/research/technical-epson-tm-m30ii-workshop-printing-2026-09-07/`; despite the historical folder name, the actual printer is **TM-m30III**, not II. Read the applicability correction before using model-specific claims.

The existing brainstorming folder `_bmad-output/brainstorming/brainstorm-workshop-task-printing-2026-09-04/` predates this work and remains untracked, deliberately excluded from this commit. Its `brainstorm-intent.md` records settled M1/M2 workflow. Preserve it. Normal mechanic interaction must be one tap, with no Feed-button step, preview, printer selection, or physical-paper lifecycle tracking.

## What exists

- `/workshop/printer-spike`: an authenticated diagnostic page within the existing application. It inherits the workshop staff role guard, reuses Subframe controls, and sends direct browser ePOS SOAP/XML requests.
- Editable private IPv4/.local HTTP(S) origin and device ID, empty connection check, fixed ASCII test receipt plus feed cut, readable diagnostics, 15-second browser deadline, 10-second Epson deadline, synchronous duplicate guard, no automatic retry.
- No new cloud application, server printer proxy, database changes, QZ bridge, customer data, or production M1/M2 printing.
- Implementation: `src/app/workshop/printer-spike/{page.tsx,_components/PrinterSpike.tsx,_lib/epos.ts}`; native tests: `src/printer-spike.test.mts`; script: `npm run test:printer-spike`.

## Hardware result — preserve this distinction

- Actual printer: TM-m30III, firmware 13.04 ESC/POS, network firmware 08.54, manual IP `192.168.1.38`, Wi-Fi confirmed in Web Config (Excellent signal). The photo's Ethernet heading does not establish a wired connection. The frozen spec's phrase superseding the Wi-Fi assumption is misleading; the user's original Wi-Fi statement was correct.
- Tested from this Mac's Chrome 152, authenticated mechanic at `http://localhost:3002`, not from the mechanics' Windows laptops or deployed HTTPS app.
- Empty status exchange succeeded. First receipt: HTTP 200, `success=false`, `EX_TIMEOUT`, status `1`, elapsed 10,595 ms; user reported no print.
- User then pressed Feed and confirmed paper advances. One controlled second browser receipt succeeded in 1,347 ms; user explicitly confirmed it **printed and cut**.
- Total physical receipt requests: two. No automatic retries, settings changes, firmware update, push, or deployment.
- Epson release notes document a 13.09 fix for ePOS printing sometimes failing from power-saving mode. Installed 13.04 predates it; after-Feed success strengthens that hypothesis but does not prove root cause. Sources and exact responses are in the evidence file.
- Firmware updates require a separate user decision: Epson warns about downgrade restrictions and enabling automatic cloud connection/serial-number upload. Do not upgrade or change settings implicitly.

## Verified at handover

- `npm run test:printer-spike`: **12/12 pass** (injected transport/parser-classifier tests, not a real DOMParser negative-case suite).
- `npm run test:workshop-ui`: **38/38 pass**.
- `npx tsc --noEmit`: pass.
- `npx eslint src/app/workshop/printer-spike src/printer-spike.test.mts`: no errors; native `.mts` test is ignored by the existing configuration (one warning). Do not describe the ignored test as linted.
- Signed-out route redirects to login; normal local mechanic login reaches the page. Real browser parsed both the failed and successful Epson replies.
- Production build, normal partner-login rejection, browser-mocked malformed/foreign/duplicate XML cases, and formal BMad code review are **not yet verified**.

## Next work, in order

1. Fix known outcome classification: `classifyReply` currently classifies every Epson `success=false/0` as `failed`, including `EX_TIMEOUT`. Treat this timeout as **unknown delivery**, preserving code/status and warning to inspect paper before retrying; add a regression test. The prior implementation agent was interrupted before applying this requested patch. There are no automatic retries even in the current code.
2. Finish real-DOM browser checks with explicitly mocked Epson replies and normal partner login. Keep mocks separate from hardware evidence; do not print as a side effect of software checks.
3. Run production build with appropriate local public auth environment; record unrelated failures rather than fixing outside scope. Avoid concurrent dev/build operations using the same `.next` directory.
4. Complete BMad build review and update spec/evidence. Do not mark the spike complete merely because one physical receipt worked.
5. Arrange controlled idle/wake reliability and deployed HTTPS Windows/Chrome tests with the user. Firmware maintenance or public deployment needs explicit scope agreement. Never silently replay a timed-out job.

## Local environment and workflow continuity

Workspace: `/Users/denyskuznetsov/.codex/worktrees/de26/echelon-cycling-hub-admin`. Dependencies installed with `npm ci`; no `.env.local` created here. Prior dev server was started on **3002** with only the public Supabase URL/anon key loaded from the main checkout's local env after checking its URL was `127.0.0.1`. Normal non-production test accounts are documented in README; never copy credentials into output or handover files. Do not touch other servers on ports 3000/3001. Verify current processes before reuse or stop.

Existing agent-browser session: `printer-spike`, previously logged in as local mechanic. It uses installed Chrome and may survive the chat. Snapshot before operating. Never rely on old element refs. Do not transfer auth cookies into documents.

BMad build was rendered once for this workflow. Current rendered directory:
`_bmad/render/bmad-build/echelon-cycling-hub-admin-de05e6a6c5d1/528b2731046a8320c943/`.
The prior chat read workflow and steps 1–4; implementation step 3 remains unfinished, and step 4 reviewers have **not** run. Resume the existing workflow if these ignored generated files remain available; do not repeat an already completed render as part of the same run. Spec status remains `in-progress`; there is no story key or sprint sync. Read applicable instructions yourself before continuing. No subagent is still implementing this checkpoint.

The `next dev` generated append to root AGENTS.md was removed from the handover diff; existing project instructions were preserved. Next may regenerate that block when restarted.

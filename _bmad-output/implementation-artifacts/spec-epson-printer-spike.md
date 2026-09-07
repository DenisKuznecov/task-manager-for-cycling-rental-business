---
title: 'Direct Epson browser printing spike'
type: chore
created: 2026-09-07
status: in-progress
baseline_commit: 9014b649d682470a10810d706932bd9a3f5a17f2
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The user's network-sheet photo identifies TM-m30III, firmware 13.04, Ethernet address 192.168.1.38/24 (superseding the earlier TM-m30II/Wi-Fi assumption). Browser connectivity is unproven. Mechanics use Windows/Chrome.

**Approach:** Add a minimal authenticated diagnostic page to the existing app that sends one fixed, clearly labelled test receipt directly from the browser. Show the exact request target and response/error so we can assess direct printing before building M1/M2 functionality. User authorized implementation with “Do the spike yourselves” after approving this scope in conversation; no further planning approval is needed.

## Boundaries & Constraints

**Always:** Reuse workshop session/role guards and Subframe controls. Keep form and attempt state local. Use documented Epson receipt SOAP/XML over HTTP(S), browser fetch with readable CORS response, omitted credentials, bounded timeout, no automatic retries. Render diagnostics as text. Distinguish acknowledged, failed and unknown outcomes; acknowledgement is not proof of physical output. Preserve existing untracked brainstorm/research files. Test credentials only against local/non-production auth.

**Ask First:** An unavailable printer address/network must be supplied before claiming a physical test; changing printer firmware, network settings or deploying publicly requires a concrete subsequent decision.

**Never:** New cloud service, server-side printer proxy, database/schema changes, auth bypass, OS print dialog, Bluetooth, QZ implementation, production M1/M2 gates, customer data, automatic page-load printing, or unrequested remote push/deploy.

## I/O & Edge-Case Matrix

| Scenario | Input/state | Expected behavior | Error handling |
|---|---|---|---|
| Address invalid | Empty/public/credentialed/pathful URL or invalid device ID | No request sent | Inline validation |
| Positive reply | Well-formed Epson response success=true/1 | Acknowledged; show code/status/raw response | Physical output remains to inspect |
| Negative reply | Epson success=false/0, including paper/cover error | Failure with Epson code | Visible error, explicit next attempt |
| Unknown result | Network reject, timeout, HTTP error, malformed/non-Epson XML | Unknown delivery; no retry | Check paper before reprinting |
| Duplicate click | Attempt still pending | One outstanding request | Busy button plus synchronous guard |

</frozen-after-approval>

## Code Map

- `src/app/workshop/layout.tsx`: existing staff role guard; inherit unchanged.
- `src/proxy.ts`, `src/utils/supabase/middleware.ts`, `src/utils/auth/public-routes.ts`: auth/redirect rules; read-only.
- `src/ui/components/{Button,TextField,Alert}.tsx`: reuse controls unchanged.
- `src/workshop-ui.test.mts`, `package.json`: native tests with .ts imports; npm ci underway.
- `README.md`: non-production test credentials; never echo.
- `next.config.js`: no printer policies; no security relaxation.
- [Research](../planning-artifacts/research/technical-epson-tm-m30ii-workshop-printing-2026-09-07/research.md), [pilot](../planning-artifacts/research/technical-epson-tm-m30ii-workshop-printing-2026-09-07/pilot-checklist.md): source-backed context, not installation proof.

## Tasks & Acceptance

**Execution:**
- [ ] `src/app/workshop/printer-spike/page.tsx` and `_components/PrinterSpike.tsx`: route and form; editable base address default http://192.168.1.38, device ID default local_printer, Test connection and Print test receipt. Collapsible diagnostics; no persistence or global navigation change.
- [ ] `src/app/workshop/printer-spike/_lib/epos.ts`: private IPv4/.local HTTP(S) origin validation; device ID; SOAP builder; namespace-aware browser DOMParser; classification; bounded fetch/body read. No runtime dependency. Separate testable pure logic.
- [ ] `src/printer-spike.test.mts`, `package.json`: test matrix including fetch request contract, no credentials/retries, timeout and duplicate guard; add test:printer-spike. Use DOM-capable browser checks for real XML parsing, not regex pretending to parse XML.
- [ ] `_bmad-output/implementation-artifacts/printer-spike-evidence.md`: record commands/results and exact local setup, mock versus real tests, unresolved physical/HTTPS-origin checks, decision and reproducible next steps. No secrets.

**Acceptance Criteria:**
- Given the existing role guards, when an unauthenticated user visits the route, then login is required; mechanic can access and partner is rejected using normal local login.
- Given the test form, when its connection action runs, then it sends empty ePOS data without a cut; when print runs, then the SOAP body contains a visibly labelled ASCII test receipt and feed cut.
- Given a result, when diagnostics render, then target, operation, HTTP status when available, elapsed time, response and honest outcome are readable; no task data is read or mutated.
- Given missing physical access, when software verification completes, then evidence explicitly marks physical printing and deployed Chrome compatibility untested; never substitute a mock for a hardware success.

## Spec Change Log

- User supplied the actual printer sheet before implementation: corrected model/network identity to TM-m30III. Preserve the direct-browser spike; do not apply TM-m30II firmware prerequisites to this unit. Parent verified the III's ePOS-Print support in Epson Rev.F pp94/134 and HTTP reachability at 192.168.1.38; root path redirects to HTTPS. See evidence file for live results.

## Design Notes

Epson Rev.S pp50–56: `/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`, `text/xml; charset=utf-8`, `SOAPAction: ""`, SOAP 1.1 Envelope/Body, ePOS namespace `http://www.epson-pos.com/schemas/2011/03/epos-print`. Empty epos-print checks status. Do not mix HTTP with socket ports. HTTP 200 alone proves nothing; fetch rejection cannot distinguish offline/permissions/TLS/CORS. Sample remains ASCII and makes no readiness claims.

## Verification

- `npm run test:printer-spike` and `npm run test:workshop-ui`: passing behavior/regression checks.
- `npx tsc --noEmit`, targeted ESLint, `npm run build`: pass with local public auth env only; baseline failures recorded separately.
- Agent-browser against isolated port 3002: login guard, normal mechanic login, form, actual DOMParser success/failure/malformed handling with explicitly mocked printer replies, partner rejection; no auth bypass. Physical test only against supplied printer address and reachable network. Keep final physical verdict pending if unavailable.

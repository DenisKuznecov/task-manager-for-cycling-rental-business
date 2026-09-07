---
title: 'Reset thermal paper body text scale'
type: 'bugfix'
created: '2026-09-07'
baseline_commit: '7124a0644f0c378052e993ffd3ed647679a0d12d'
status: 'done'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Epson printer preserves the double-width/double-height setting used for each paper title. Because later text commands do not reset it, the M1 re-check tag has no meaningful title hierarchy and the M2 checklist becomes an oversized, excessively long receipt.

**Approach:** Keep each requested title enlarged, then explicitly restore normal text size for every remaining text block. Add one small line of space between the M2 logo and title; do not make any other visual, content, checklist, printer, or workflow change.

## Boundaries & Constraints

**Always:** M1 has exactly one enlarged text block: centered `RE-CHECK TAG`. Its order/bike/stock block and `Prepared by`/name/date block explicitly set `dw="false" dh="false"`. M2 has exactly one enlarged text block: centered `BIKE READY FOR PICKUP`. Its order/bike/checklist heading, checklist entries, and accountability footer each explicitly set `dw="false" dh="false"`. Keep the existing compact monochrome logo and add exactly `<feed line="1"/>` after it and before the M2 title. Preserve 48-column normal-text wrapping, trailing checklist statuses, logo dimensions and payload, contents, alignment, date copy, final feed/cut, gates, transport, reprints, and task state.

**Ask First:** Sending another physical printer job, changing the printer’s settings/firmware/network, changing the logo or its dimensions, changing any paper text, or intentionally changing normal body text size.

**Never:** Modify database/RLS/RPC/server actions/loaders, print transport/configuration, app workflow, document content/order, title wording, checklist logic/statuses, customer data, or `AGENTS.md` (the user will handle its dev-server-generated change).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| M1 title and details | Eligible M1 print document | Only `RE-CHECK TAG` is enlarged; every later M1 text block explicitly restores normal scale | Existing print outcome handling remains unchanged |
| M2 logo and title | Eligible M2 print document | Existing image is followed by exactly one feed line, then the sole enlarged M2 title | Existing print outcome handling remains unchanged |
| M2 checklist and footer | Existing long, wrapped checklist and accountability data | Every post-title text block is explicitly normal scale; 48-column wrapping and trailing markers remain intact | No marker/status/content change |
| Printer state persists | Device carries double-size state across ePOS text elements | Explicit false attributes stop double-size rendering from leaking into body text | No column-count workaround or printer setting change |

</frozen-after-approval>

## Code Map

- `src/lib/workshop/printing/documents.ts:80-85` -- `text()` emits supplied ePOS attributes verbatim; empty attributes currently rely on unsafe printer defaults.
- `src/lib/workshop/printing/documents.ts:126-138` -- M1 title/body/footer composition; retain only the title’s true size flags and attach false flags to both following blocks.
- `src/lib/workshop/printing/documents.ts:141-164` -- M2 image/title/body/checklist/footer composition; add only the one-line image margin and false flags on its three non-title text blocks.
- `src/lib/workshop/printing/logo.ts:1-52` -- checked-in, validated one-bit logo geometry and bytes are deliberately out of scope.
- `src/workshop-printing.test.mts:231-353` -- direct ePOS payload tests already prove title attributes, image order, long checklist wrapping, and normal text conversion; extend them for explicit scale resets and the feed gap.
- `AGENTS.md` -- currently modified by `next dev`; user-owned and excluded from this correction.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/workshop/printing/documents.ts` -- explicitly reset `dw`/`dh` to false after the M1/M2 title blocks and place the single M2 logo margin feed, without altering any other emitted content or commands.
- [x] `src/workshop-printing.test.mts` -- assert exact M1/M2 enlarged-versus-normal text-block counts, the logo/feed/title sequence, and retained normal-scale checklist/footer behavior.

**Acceptance Criteria:**
- Given an M1 document, when it is generated, then `RE-CHECK TAG` is the only double-size text block and all later M1 text explicitly uses normal scale.
- Given an M2 document, when it is generated, then the logo is separated from the title by exactly one feed line, and `BIKE READY FOR PICKUP` is the only double-size text block.
- Given long M2 rows, when the document is generated, then their existing 48-column wrapping and trailing status suffixes remain unchanged while their enclosing text block explicitly uses normal scale.
- Given either document, when it is sent through the existing action, then printer gating, request handling, retries, reprints, cuts, and task state are unchanged.

## Spec Change Log

## Design Notes

The printer’s text-size state is sticky, so absent attributes do not mean normal size. The relevant M2 command boundary is:

```xml
<image ...>...</image><feed line="1"/>
<text align="center" dw="true" dh="true">BIKE READY FOR PICKUP</text>
<text dw="false" dh="false">Order and bike metadata</text>
<text dw="false" dh="false">Checklist entries</text>
<text dw="false" dh="false">Mechanic accountability footer</text>
```

## Verification

**Commands:**
- `npm run test:workshop-printing` -- expected: all printer payload, gate, transport, and regression cases pass without contacting the printer.
- `npx tsc --noEmit` -- expected: application type-check passes.
- `npx eslint src/lib/workshop/printing/documents.ts src/workshop-printing.test.mts --no-warn-ignored` -- expected: no lint errors in changed files.
- `git diff --check` -- expected: no whitespace errors.

**Manual checks (if approved separately):**
- Print one M1 and one M2; only each title should be visibly larger, M2’s logo should have a small gap beneath it, and the checklist should return to its compact normal-scale height.

## Suggested Review Order

**Sticky printer-state resets**

- Emit normal-scale attributes directly on every post-title text block.
  [`documents.ts:126`](../../src/lib/workshop/printing/documents.ts#L126)

- Preserve the logo while introducing exactly one separating feed line.
  [`documents.ts:141`](../../src/lib/workshop/printing/documents.ts#L141)

**Payload regression coverage**

- Lock M1 to one enlarged title followed by two explicit normal blocks.
  [`workshop-printing.test.mts:231`](../../src/workshop-printing.test.mts#L231)

- Lock M2 title hierarchy, logo spacing, and normal body-scale sequence.
  [`workshop-printing.test.mts:256`](../../src/workshop-printing.test.mts#L256)

- Retain wrapped checklist status suffixes under explicit normal scale.
  [`workshop-printing.test.mts:333`](../../src/workshop-printing.test.mts#L333)

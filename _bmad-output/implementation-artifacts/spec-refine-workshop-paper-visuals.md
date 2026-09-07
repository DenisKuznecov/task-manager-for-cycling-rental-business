---
title: 'Refine workshop handoff paper visuals'
type: 'bugfix'
created: '2026-09-07'
status: 'done'
baseline_commit: 8336367c32d5077c79fe635d4716627c558ef6fb
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The physical M1 re-check tag and M2 ready-for-pickup checklist are usable but lack the visual hierarchy mechanics need. Real printer output also turns the bike’s feet-and-inches symbols into question marks, wraps the preparer’s name poorly, exposes unnecessary M2 stock information, and places checklist status marks on both sides of each item. The final checklist should also carry the established Echelon logo as a clear but compact paper header.

**Approach:** Refine the existing Epson ePOS document builders only. Make each paper’s operational title prominent, normalize printable bike text, restructure the metadata, status marks, and accountability footer, and place a monochrome Echelon raster logo above the M2 title—without changing printer transport, gates, task state, or persisted data.

## Boundaries & Constraints

**Always:** M1 has a visually largest centered `RE-CHECK TAG` title and no standalone `1`; its bike name and stock ID use normal body text; render `Prepared by` and the mechanic name as separate lines; preserve the existing date format. M2 starts with a centered, compact, one-bit Echelon raster logo, followed by a visually prominent centered `BIKE READY FOR PICKUP` title; it omits the stock-ID line and retains the complete sorted checklist with M1/M2 applicability and PSI details. Derive the committed raster from the existing public `echelon-assets/logo dots orange.png` object, not the supplied signed URL or a runtime Storage request. Replace Unicode feet/inches primes with ASCII apostrophe/double quote before the existing ASCII fallback. Put every checklist status marker only after its item text, preserving whether it is M1 complete, M1 N/A, or M2 re-check complete. End M2 with preparer, re-checker, then `Bike was prepared at <timestamp>`.

**Ask First:** Printing a real job, replacing the source brand asset, changing printer setup/firmware/network settings, altering Epson transport/configuration, or changing the wording beyond the agreed labels and timestamp sentence.

**Never:** Change database schema, RLS, RPCs, server actions, loader DTOs, attestation gates, print/retry behavior, paper lifecycle state, customer data scope, or add an alternate printer transport, preview, runtime logo download, signed URL/token, or new UI flow.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| M1 re-check print | Persisted M1 attestation and ordinary bike data | Large `RE-CHECK TAG`; no `1`; bike/stock body lines; `Prepared by` and name on distinct lines; existing timestamp format | Existing transport result handling is unchanged |
| Bike measurements | Bike name includes `5′9″–6′3″` | Document contains printable `5'9"-6'3"`, never question marks for those symbols | Existing generic non-ASCII fallback remains for unsupported content |
| M2 final print | Persisted M1 and M2 attestations | Large title, no stock ID, sorted checklist, one trailing status representation per item, ordered accountability/footer lines | Existing gate and no-retry semantics are unchanged |
| M2 logo header | Existing Echelon orange PNG | A compact, centered one-bit ePOS `<image>` appears before the M2 title; orange is intentionally rendered as black | Invalid committed raster fails tests; a print never silently drops the requested header |
| M1-only / N/A / M2 item | Existing checklist applicability and completion state | The trailing marker preserves `[X]`, `[N/A]`, and M2 re-check meaning without a leading or duplicated marker | No status inference or state mutation |

</frozen-after-approval>

## Code Map

- `src/lib/workshop/printing/documents.ts:27-34` -- `normalizePrintableText` currently decomposes diacritics but falls back to `?`; add explicit ASCII mappings for feet/inches primes before fallback.
- `src/lib/workshop/printing/documents.ts:96-109` -- `m1Mark`, `m2Mark`, and `checklistLine` generate the leading and trailing marker layout; preserve semantic states while composing trailing-only markers.
- `src/lib/workshop/printing/documents.ts:111-150` -- M1/M2 ePOS builders define alignment, double-size emphasis, metadata lines, checklist output, and footer ordering; this is the sole production layout change.
- `src/lib/workshop/printing/logo.ts` -- add a versioned, validated monochrome ePOS raster derived once from the existing public Echelon logo; keeping printer-ready bytes local avoids a client Storage fetch and a committed signed token.
- `src/workshop-printing.test.mts:225-318` -- existing document payload assertions are the regression home for hierarchy commands, sanitized measurement text, M2 stock omission, marker placement, and footer order.
- `src/app/workshop/_components/WorkshopPrintActions.tsx:48-80` -- invokes builders through the existing client printer transport; leave request locking, errors, and reprint behavior unchanged.
- `src/lib/workshop/domain/dtos.ts:11-64` -- existing DTO fields already supply all content; do not extend loaders or storage.
- `src/app/login/_components/LoginForm.tsx:74,110` -- already references the same public `logo dots orange.png` source; this confirms the asset identity without reusing its signed URL.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/workshop/printing/logo.ts` -- add the compact, width-byte-aligned black-and-white raster payload and its dimensions, with validation that the Base64 byte count matches the ePOS image geometry.
- [x] `src/lib/workshop/printing/documents.ts` -- revise printable-text normalization and M1/M2 ePOS document composition to match the approved paper hierarchy and content rules while retaining XML escaping and 48-column wrapping.
- [x] `src/workshop-printing.test.mts` -- update existing document assertions and add regressions for the top-of-M2 monochrome image and geometry, prime conversion, no M1 numeral, enlarged titles, separate M1 preparer lines, M2 stock omission, trailing-only checklist markers, and footer order.

**Acceptance Criteria:**
- Given an eligible M1 print, when its document is generated, then `RE-CHECK TAG` is the sole enlarged visual cue and no standalone numeric label is printed.
- Given the printed sample’s measurement characters, when bike metadata is generated, then the physical document receives ASCII feet/inches notation rather than question marks.
- Given an eligible M2 print, when its document is generated, then a centered monochrome Echelon raster appears before `BIKE READY FOR PICKUP`, with no network request or signed URL required at print time.
- Given any checklist row, when M2 is generated, then its status information appears only after the item label while still distinguishing M1 complete, M1 N/A, and applicable M2 re-check completion.
- Given an eligible M2 print, when its document is generated, then it has no stock ID and ends with the two mechanic lines followed by the preparation timestamp sentence.
- Given the visual-only change, when task printing is exercised, then existing attestation gates, transport outcome handling, no-retry behavior, and task state remain unchanged.

## Spec Change Log

## Design Notes

The existing double-width/double-height ePOS attributes establish hierarchy without relying on unsupported glyphs. Epson ePOS `<image>` accepts an embedded Base64 raster; keep the one-bit logo width aligned to a byte boundary and compact enough for the 80 mm receipt. The following are separate canonical paper examples, not one M2 print order:

```text
RE-CHECK TAG
Bike: Focus Aventura2 6.7 - size L, 5'9"-6'3"
Prepared by
Denys Kuznetsov
```

```text
[centered monochrome Echelon logo]
BIKE READY FOR PICKUP

Check front brake performance M2 [X]
Bike prepared by Denys Kuznetsov
Bike re-checked by Denys Kuznetsov
Bike was prepared at 7 Sep 2026, 13:45
```

## Verification

**Commands:**
- `npm run test:workshop-printing` -- expected: all document, transport, gate, timeout, no-retry, and reprint cases pass without contacting the printer.
- `npx tsc --noEmit` -- expected: application type-check passes.
- `npx eslint src/lib/workshop/printing/logo.ts src/lib/workshop/printing/documents.ts src/workshop-printing.test.mts --no-warn-ignored` -- expected: no lint errors in changed production and test files.
- `git diff --check` -- expected: no whitespace errors.

**Manual checks (if approved separately):**
- Print one M1 and one longest M2 job on the workshop Epson printer; expect a clean black Echelon logo above the M2 title, titles as the strongest cues, no question marks for feet/inches notation, a compact trailing-marker checklist, an unwrapped M1 preparer name, and all M2 footer lines readable.

## Suggested Review Order

**Paper document assembly**

- M1 hierarchy now makes the re-check instruction unmistakable without altering print transport.
  [`documents.ts:126`](../../src/lib/workshop/printing/documents.ts#L126)

- M2 composes the local logo, title, compact checklist, and accountable footer in one payload.
  [`documents.ts:141`](../../src/lib/workshop/printing/documents.ts#L141)

- Checklist wrapping reserves the suffix so completion markers remain attached to their item.
  [`documents.ts:119`](../../src/lib/workshop/printing/documents.ts#L119)

**Logo integrity**

- A checked-in one-bit raster eliminates print-time storage/network dependencies.
  [`logo.ts:1`](../../src/lib/workshop/printing/logo.ts#L1)

- Validate byte alignment, Base64, geometry, and nonblank raster data before printing.
  [`logo.ts:26`](../../src/lib/workshop/printing/logo.ts#L26)

**Regression coverage**

- Lock the M1 title, printable dimensions, stock visibility, and footer ordering.
  [`workshop-printing.test.mts:231`](../../src/workshop-printing.test.mts#L231)

- Exercise malformed logo data and long-item marker attachment, not just happy paths.
  [`workshop-printing.test.mts:302`](../../src/workshop-printing.test.mts#L302)

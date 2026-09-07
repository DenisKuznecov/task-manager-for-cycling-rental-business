# Epson TM-m30II workshop printing: research brief

Approved by Den on 2026-09-07 following the plan presented in this task.

## Decision and requirements context

Determine the capabilities and feasible connection architecture for the existing Epson TM-m30II. Prefer network/IP printing from the workshop app device, with no manual Bluetooth pairing and a one-tap print action after initial setup.

The user-named context document is `../../../brainstorming/brainstorm-workshop-task-printing-2026-09-04/brainstorm-intent.md`. It specifies a monochrome M1 tag with a prominent `1`, order number, bike name, and stock ID, and an M2 customer checklist with separate preparation/re-check marks, staff names, and preparation timestamp. Both must support reprinting; errors must be visible but cannot block task progression. This is receipt-roll output, with no A4 requirement.

Project context frames requirements only and is not external evidence. No source files or database changes are authorized by this research task.

## Method

- Intent: run; type: technical; shape: explore feasibility, with an options comparison rather than a weighted procurement selection.
- Topology: straightforward, one research assistant; independent verifier when evidence lands, as required by Deep Recon.
- Standard preset: up to 8 distinct sources per dimension per round, up to 2 rounds. Normal verification; no separate red-team pass.
- Dimensions in report order: hardware/media capabilities; integration/browser/network interoperability; operational behavior and implementation recommendation.
- Search surface: live web search and primary documentation. Installed GitHub search is available for relevant upstream material; no specialized Epson search connector or external research source is configured. No workflow orchestration needed for this focused run.
- Prefer Epson technical references and SDK documentation, browser-vendor documentation, and official documentation of any fallback printing tool. Independent publishers are required for verified status; two Epson documents are still one publisher.
- Freshness windows: versions/compatibility 1 month; ecosystem 6 months; landscape 12 months; architecture patterns 24 months. Publication dates remain unknown when a source does not supply them; retrieval today does not make an older document new.
- Expected active duration: 10–20 minutes; stop and synthesize if budget is exhausted.

## Open installation details

Den confirmed on 2026-09-07 that mechanics use Windows laptops with Chrome and the printer is already connected via Wi-Fi. The source README identifies Vercel hosting; this is project context, not evidence for platform behavior. A scoped source search found no existing Epson/ePOS/QZ/PrintNode integration to reuse.

Exact printer SKU/interfaces, firmware, Chrome version, local-network reachability, and certificate configuration remain unknown. Research now focuses on Windows/Chrome. Conclusions remain conditional on the actual installation passing a hardware/browser pilot.

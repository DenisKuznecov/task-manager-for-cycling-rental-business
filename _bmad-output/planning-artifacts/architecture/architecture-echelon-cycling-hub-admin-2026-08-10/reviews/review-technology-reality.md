# Final Technology-Reality Recheck — AD-15 Receipt Fencing

**Target:** `ARCHITECTURE-SPINE.md`  
**Reviewed:** 2026-08-12  
**Lens:** latest AD-15 receipt-generation closure against the sole remaining high finding  
**Verdict:** **PASS — the receipt-versus-completion race is now architecturally fenced.**

No critical/high technology-reality finding remains.

## Closure verification

The prior failure scenario was:

1. a worker claims and fetches source state;
2. a newer webhook receipt arrives while that intent is leased;
3. the receipt attaches to the leased intent;
4. the worker completes from its older fetch;
5. no successor refresh is guaranteed.

The latest AD-15 closes every required part of that race:

- each intent has monotonic `receipt_generation`;
- claim captures `covered_receipt_generation`;
- every attempt records its covered receipt range;
- completion requires both unchanged lease generation and unchanged receipt generation;
- a receipt arriving after claim/fetch fencing prevents terminal absorption by atomically leaving/creating a successor claimable intent, or by requiring a new bounded attempt from the same worker;
- the invariant is explicit: every receipt must be covered by a canonical fetch begun after that receipt.

This is the necessary concurrency contract. A late receipt can no longer be represented as covered by a fetch that began before it. Lease fencing still prevents an expired worker from overwriting a later attempt, while receipt-generation fencing independently prevents a current lease from consuming newer notification work.

## Required implementation proof

AD-15 remains a committed design, not implemented proof. Its existing fixture gate must cover at least:

- receipt commits before terminal completion CAS: completion detects generation change and leaves/creates successor work;
- terminal completion commits first: the later receipt opens a successor intent;
- multiple receipts during one lease coalesce without losing the highest generation;
- lease expiry plus new receipt cannot let the expired worker complete;
- successor creation/release and current-attempt terminalization are one transaction;
- each attempt's recorded covered range matches a fetch start after the covered receipts;
- worker budget exhaustion leaves durable claimable/exhausted lineage without dropping uncovered generations.

These are implementation fixtures under the spine's existing activation gates, not remaining architecture defects.

## Technology-reality disposition

- Supabase/PostgreSQL can implement the generation counters, row locking, compare-and-set completion, atomic successor creation, and attempt lineage described.
- Supabase Cron plus the protected bounded Next.js worker remains a supported handoff.
- Provider delivery IDs remain correctly limited to optional deduplication; they are not used as source ordering or fetch-coverage proof.
- Nightly reconciliation and JIT remain independent repair/freshness paths rather than substitutes for receipt correctness.
- The previously verified Next.js/Node/Supabase SSR, Vercel, Booqable mapping, comparator, multi-quantity, privilege, CI, and remote-environment conditions remain explicit non-bypassable gates.

## Final gate result

**PASS.** The sole high finding is closed. No remaining critical/high technology-reality finding is evident in the latest spine.

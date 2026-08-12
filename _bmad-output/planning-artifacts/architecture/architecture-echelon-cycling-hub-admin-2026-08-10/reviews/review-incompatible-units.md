# Final Adversarial Compatibility Gate — Architecture Spine

## Verdict

**PASS — all six previously remaining incompatibility pairs are closed, with no remaining critical/high cross-unit compatibility finding.**

The latest spine now forces independently built units onto compatible semantics for disabled derivation, receipt fencing, rollout enrollment, irreversible correction, Item-save freshness, and terminal membership reappearance. The remaining open items are explicit proof/re-scope or production-activation blockers; they no longer permit dependent units to choose incompatible contracts.

## Review Boundary

- Target: latest `ARCHITECTURE-SPINE.md`, updated 2026-08-12.
- Re-test set: the six findings from the prior final gate.
- Test: construct the previously valid Unit A/Unit B pair and determine whether both can still obey every applicable AD literally.
- Pass condition: at least one side of every prior pair is now explicitly prohibited or both sides are forced through one authoritative contract/state transition.
- Scope: feature-altitude cross-unit compatibility, not implementation completeness or proof that external Booqable fields satisfy the activation fixtures.

## Six-Pair Re-test

1. **Disabled derivation — closed.**
   - AD-16 now returns explicit `derivation_disabled`, advances only observed source state, and preserves materialization debt.
   - AD-14 separates `observed_source_watermark` from `materialized_derivation_watermark`.
   - Enrollment/enable must force one accepted `order_graph` derivation for every enrolled order before routes/actions activate.
   - The former Unit A can no longer mark a no-op stub as materially derived, and the former Unit B can no longer skip replay merely because observation is current.

2. **Receipt attached after claim/fetch fencing — closed.**
   - AD-15 gives every intent a monotonic `receipt_generation`; claim captures `covered_receipt_generation`, and attempts persist their covered range.
   - Completion requires unchanged lease and receipt generations.
   - A receipt arriving after the fence atomically leaves/creates successor claimable work or causes another bounded attempt whose fetch begins after that receipt.
   - The former receiver/worker race can no longer terminally consume a signal using authority fetched before it.

3. **Unknown boundary orders — closed.**
   - AD-14 keeps the completed two-sweep known-ID manifest.
   - An absent order may auto-enroll only when a separately proven source-created sequence classifies it post-boundary.
   - Without that proof, explicit operator enrollment is mandatory.
   - The former Unit A interpretation “absent means post-boundary” is now prohibited; fail-closed behavior is deterministic.

4. **Correction identity — closed.**
   - AD-14 prohibits editing the false terminal row.
   - The correction capability must create exactly one linked correction-successor membership/task as authoritative current.
   - Original evidence/history remains read-only; only still-valid evidence with matching source context/generation may be referenced, and all other work reopens.
   - AD-5 explicitly permits the AD-14 correction successor while same-stock terminal reappearance otherwise remains incident-only.
   - The former same-row-repair implementation is no longer compliant.

5. **Item-save JIT — closed.**
   - AD-15 now states that ordinary Item outcome/value saves, Notes, attention, modifications, and templates are always local-only.
   - JIT remains mandatory for the enumerated workflow/source-generation mutations, and those transitions re-read local records after refresh.
   - The former interpretation that satisfying a required Item itself triggers JIT is explicitly excluded.

6. **Terminal membership reappearance — closed.**
   - AD-5 now states that same-stock reappearance after Done or Force-closed creates an incident and no new incarnation/task.
   - Only a source-proven new rental identity or the narrowly defined AD-14 correction successor may proceed.
   - The former implementation that opened a new incarnation merely because the prior one was terminal is no longer compliant.

## Adversarial Interaction Checks

- **Disabled derivation × rollout:** enable cannot expose routes/actions until each enrolled order has a materialized accepted derivation; an observation-only watermark cannot satisfy the gate.
- **Receipt fencing × intent coalescing:** receipts still coalesce through the repository-owned operational contract, but generation fencing prevents coalescing from erasing post-fetch work.
- **Boundary manifest × mapping/allowlist:** absent IDs fail closed unless a source-created sequence is separately proven; mapping decomposition and allowlist reclassification remain independently gated.
- **Correction × terminal identity:** ordinary lifecycle finality remains intact because correction creates a linked successor rather than mutating terminal history.
- **Correction × evidence:** evidence is neither silently copied nor discarded; context/generation matching controls references, while unmatched requirements reopen.
- **Item saves × transitions:** local evidence can commute under its own revisions; transition JIT then locks and re-reads confirmed evidence and source generations before mutation.
- **Terminal reappearance × replacement:** same-stock reappearance is incident-only, while a different StockItem follows the existing replacement/incarnation rule.
- **Security × correction:** the capability remains narrowly owned; ordinary API/lifecycle roles retain no terminal bypass or direct authoritative DML.
- **Events × correction:** correction events are covered by AD-18’s generated event catalogue and append-only ordering rules.
- **Recovery × activation:** unresolved high-severity scoped derivation/security incidents still gate activation, while emergency disable remains available.

## Remaining Non-Compatibility Gates

- Prove or re-scope the multi-quantity source-unit discriminator.
- Align FR-3 with unconditional unassignment or approve an enforceable presence lease.
- Approve/prove ProductGroup, Setup Category, and pickup/rental-phase mappings before dependent decomposition.
- Prove absence authority before complete-scope omission may close children.
- Complete the supported Next.js/Node, Supabase SSR, Vercel, PostgreSQL/extension, privilege, and CLI production gates.

These items can block decomposition or activation exactly as documented, but they do not leave two independently built, currently authorized units free to choose incompatible semantics.

## Final Gate

No surviving pair was found in which both units obey the latest ADs literally yet disagree on shared shape, ownership, writers, freshness, retry identity/state, membership identity, sequencing, activation, correction, or recovery. The spine passes the adversarial compatibility gate.

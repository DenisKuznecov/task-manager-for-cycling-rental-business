# Spike Reconciliation Review

**Reviewed:** `ARCHITECTURE-SPINE.md` against `technical-booqable-selective-warehouse-spike-research-2026-08-10.md`  
**Verdict:** **PASS WITH QUALIFICATIONS**

The updated spine lands the spike's load-bearing architecture decision: commit to one minimum safe, one-way, shared Booqable projection inside the modular monolith, and make its recoverable integration foundation a prerequisite to dependent Workshop work. Boundaries, shared entities, source/app ownership, layered freshness, canonical ingestion, durable recovery, and expand-switch-contract sequencing are materially consistent with the spike.

One statement overclaims what the spike proved, and several smaller operational or traceability details are incomplete. None reverses the architecture decision, but the unsupported evidence claim should not be treated as established fact during story creation.

## Load-bearing reconciliation

### 1. Boundary and commitment — landed

- The spike's conditional go is bounded to the minimum safe multi-entity projection and expressly rejects a broad mirror, warehouse platform, broker, microservice, ORM, and permanent raw-payload store.
- The spine matches this in the design paradigm, AD-1, AD-3, AD-14, the structural seed, and the deployment sequence. Workshop code consumes normalized local contracts and cannot parse or call Booqable directly.
- The admitted graph is appropriately narrow: existing shared Customers, Orders, and Lines/order items; approved bike ProductGroups/Products; Bundles/BundleItems only where the workflow needs bundle structure; Plannings; StockItemPlannings; StockItems; historical order-bike membership; and operational inbox/run/checkpoint/incident state.
- Coupon completeness, non-bike physical history, broad analytics, and generic warehouse infrastructure have not leaked into the commitment.

### 2. Shared entities and one canonical projection — landed

- The spike requires evolving the existing shared customer/order/line projection rather than creating a Workshop copy.
- AD-3 and AD-14 accurately preserve the existing `customers`, `orders`, and `order_items` consumers, establish one additive canonical projection, and converge webhook, just-in-time, backfill, retry, and reconciliation callers on one ingestion capability.
- The spine correctly makes legacy direct writes temporary during expand-switch-contract and revokes them only after caller cutover. This preserves brownfield consumers while preventing permanent competing writers.

### 3. Ownership and authority — landed, with one wording ambiguity

- The spike's ownership split is preserved: Booqable remains authoritative for projected source fields; Workshop owns task lifecycle, attestations, modifications, Notes, attention, and audit.
- The spine correctly separates local-customer creation from ingestion authority and prevents it from writing Booqable-owned fields.
- Historical source identity and assignments are retained rather than cascade-deleted, and permanent raw customer payloads are excluded.
- AD-3's phrase “archive-capable entities ... become inactive/closed” is broader than the spike's unresolved customer archival/PII policy. The Deferred section supplies the intended limit, but stories must not read AD-3 as authorization to automate archived-customer retention or anonymization.

### 4. Proven source graph and explicit unknowns — landed

- The spine uses the proven `Order → Line → Planning → StockItemPlanning → StockItem` path and preserves opaque source IDs and exact relationships.
- Missing StockItemPlanning/StockItem identity remains an explicit unknown and produces a visible non-claimable state; title matching and guessed assignment are prohibited.
- Stable ProductGroup-ID classification, fail-closed handling for unmapped trackable groups, and the documented nested-order-include fallback all match the spike.
- The preferred standalone StockItem/StockItemPlanning collection path is correctly treated as observed optimization, not documented dependency.

### 5. Freshness and canonical application — landed

- Webhook bodies remain signals only; current canonical Booqable state is refetched, validated, normalized, and submitted through one ingestion operation.
- The spine preserves source `updated_at` separately from ingestion/attempt/success time and uses proven source versions rather than local attempt order as freshness authority.
- Atomic snapshot application, idempotent no-op handling, stale-state rejection/quarantine, and equal-version/different-content quarantine are consistent with the spike's proof and recommendations.
- The normalizer-version/rebaseline protocol is additional architecture detail, not contradicted by the spike.

### 6. Failure recovery and operations — landed, with checkpoint precision missing

- Durable receipt before external I/O, prompt acknowledgement, bounded worker claims, persisted attempts/success/failure, operator retry, and nightly selective reconciliation all landed.
- Webhook delivery is correctly not a correctness boundary. Missed, unsupported, duplicate, delayed, failed, and out-of-order paths converge through refetch plus reconciliation.
- Retries are bounded and use backoff/jitter; reconciliation has durable page/keyset checkpoints and overlap control; manual source/task-table repair is prohibited.
- The spike specifically requires advancing a checkpoint after each successfully committed page. AD-15 names durable checkpoints but does not explicitly bind checkpoint advancement to the same successful page/application commit. Implementers must preserve that ordering so a checkpoint can never move past uncommitted projection work.

### 7. Sequencing and prerequisite foundation — landed

- Security containment comes first: stop logging supplied webhook secrets and disable/authenticate/environment-guard the service-role sandbox route.
- The integration foundation then adds backward-compatible projection, inbox, checkpoints, ingestion, typed adapters, atomic application, fixtures, privilege/recovery tests, bounded shadow reconciliation, freshness/failed-event visibility, and caller cutover.
- Only after counts/gaps and caller cutover are verified does the sequence contract legacy DML and allow Workshop derivation/actions to bind to the shared contract.
- Database-owned disabled/pilot/enabled state, enrollment watermarks, zero-unresolved-incident gates, reconciliation before re-enable, and non-destructive rollback accurately strengthen the spike's “foundation before dependent Workshop implementation” conclusion.
- Remote migration remains CI-only, and the actual Vercel compute mode/budget must be verified rather than inferred from the measured 84.95-second scan.

## Findings requiring attention

### Finding 1 — “Proven quantity/planning-instance disambiguation” is not proved by the spike

AD-5 says membership mapping includes “proven quantity/planning-instance disambiguation.” The spike proves stable IDs and exact relationships for observed Plannings, StockItemPlannings, and StockItems, and reports 406 bike Planning rows representing 434 expected units with 343 exact assignments. It does **not** document an executable assertion or live-data analysis proving a stable one-membership-per-unit discriminator for every quantity greater than one, unknown assignment, planning replacement, removal, and re-add case.

This is **missing evidence, not an intentionally Deferred matter**. The immutable-membership design may still be valid, but stories must treat the disambiguation scheme as an implementation invariant requiring fixture/live-evidence proof, not as a fact already established by the spike.

### Finding 2 — The spine obscures the spike's “conditional go” classification

The spike commits to the foundation but classifies the decision as conditional. The spine is marked `status: final`, and its major rules are Adopted; its activation conditions are distributed across AD-13 through AD-15 and Deferred.

The substance is present, but the presentation can be misread as unconditional approval. The correct interpretation is: the architecture is final, the minimum foundation is committed, and production activation remains conditional on the approved ProductGroup allowlist, required field proof or re-scoping, completed production fixtures/privilege tests, caller cutover, measured operating proof, and recovery readiness.

### Finding 3 — Checkpoint advancement is not explicitly coupled to successful page commit

The spike's recovery requirement is precise: persist progress after each committed page and resume without replay damage. The spine requires durable keyset/page checkpoints but does not state that a checkpoint may advance only after, or atomically with, successful ingestion of that page.

This is a **partial landing of a firm recovery conclusion**. It should be enforced in foundation stories and tests; otherwise an interrupted run could permanently skip work even though a checkpoint exists.

### Finding 4 — Coverage reporting by order status is not explicit

The spike says assignment coverage must continue to be reported by order status rather than hidden behind one overall percentage. This matters because observed stopped/started coverage was 100%, reserved was 97.5%, while draft/canceled unknowns were much larger and legitimate.

AD-14 requires count/gap verification, and AD-13 preserves explicit unknowns, but neither requires the gap report to retain status segmentation. This is a **missing proof/operations detail**, not Deferred scope. Foundation acceptance should preserve status-aware coverage reporting so expected unknowns cannot mask a regression in active or completed rentals.

### Finding 5 — Two secondary operational controls are implicit rather than explicit

- The spike recommends a read-only or least-privileged Booqable integration identity where Booqable permits it. The spine confines credentials to the server-side adapter and tightly scopes PostgreSQL capabilities, but it does not state the upstream API-identity requirement.
- The spike identifies Supabase Free-plan inactivity pause as a possible cause of silent ingestion interruption. The spine requires freshness/last-success visibility, which provides the detection primitive, but does not require operators to distinguish environment pause from adapter/reconciliation failure.

These do not alter the projection boundary, but they belong in integration-foundation security and operations acceptance rather than being lost during decomposition.

## Intentionally Deferred, accurately bounded

- **ProductGroup classification approval:** live IDs and relationships are proven; the production bike allowlist remains a business approval gate. Runtime title classification is forbidden.
- **Setup Category and picked-up/active-rental fields:** affected behavior cannot activate until stable fields are proved; failed proof requires re-scoping, not inference.
- **Customer archival/PII policy:** source identity/history is preserved, but automated archived-customer retention/anonymization awaits product policy.
- **Formal standalone inventory endpoint contract:** Booqable confirmation can wait because the documented nested-order fallback is mandatory and fixture-tested.
- **Broader UI/E2E coverage:** broader coverage is later; database invariants, adapter fixtures, privilege checks, and claim-race testing are prerequisites and are not Deferred.
- **Broader bike history/analytics, manager reason fields, and offline operation:** these remain outside the committed foundation without weakening its source identity or recovery guarantees.

## Missing evidence or implementation proof — not Deferred

- Stable quantity/planning-instance membership disambiguation across all lifecycle cases.
- Production migrations, ingestion functions, privilege boundaries, and Booqable-specific fixtures; the spike proved the operating model with synthetic local tables, not the final schema.
- Actual deployed Vercel compute mode and measured end-to-end fetch/validation/write budget.
- Status-segmented production/shadow coverage and gap results.
- Successful checkpoint/page-commit coupling under interruption.

The spine correctly treats the last four as pre-activation foundation work. Only the first is presently worded as though proof already exists.

## Final assessment

No second projection, competing writer, broad warehouse, webhook-only correctness assumption, destructive history policy, or manual-repair recovery path survived into the updated spine. The prerequisite foundation and sequencing are strong enough to guide decomposition. Reconciliation is therefore a substantive pass, qualified by the unsupported “proven” identity-disambiguation claim and the smaller proof/operations precision gaps above.

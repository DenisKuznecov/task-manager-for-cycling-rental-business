# Cross-Epic Seam Review — Updated Workshop Tasks Architecture Spine

## Verdict

**CONDITIONAL PASS — the domain model and main Booqable convergence path are coherent, but rollout is not yet safe for independent epic decomposition.**

The updated spine closes the earlier identity, absence, derivation-debt, partner-map, retry-lineage, disabled-derivation, and irreversible-correction disagreements. It now describes one intended path from Booqable adapter through a versioned envelope and transactional ingestion into Workshop derivation, read models, capability actions, shared brownfield consumers, and staged activation.

The remaining risk is concentrated in the handoffs between those modules and in the operational meaning of “proved,” “pilot,” “rollback,” and “paper retirement.” Several gates name evidence without binding the artifact, token, scope, or pass/fail rule that independently implemented epics must share. Two teams can therefore comply with the prose while making incompatible choices.

**Finding count:** 0 critical · 4 high · 7 medium · 1 low

## Findings

### 1. High — Consequential JIT refresh is not cryptographically or transactionally bound to the command it authorizes

**Where:** AD-9, AD-14, AD-15, AD-16; Consistency Conventions “Integration freshness.”

AD-15 requires a current-attempt `applied/no_op` JIT result before consequential commands, and AD-16 returns source/derivation watermarks. The spine never says what exact proof the caller passes to the subsequent mutation RPC or what the mutation locks and compares. One action epic can implement “refresh, then call command” using only a task revision; another can require an attempt ID, epoch, order watermark, and derivation watermark; a third can treat a recent successful intent as sufficient.

That is a real adapter → ingestion → Workshop-action seam. Without a single command precondition contract, a command can be admitted using a JIT result for the wrong schema, cohort, order generation, or derivation epoch, or after a newer accepted source change has advanced local state.

**Required closure:** define one versioned `freshness_proof` returned by ingestion and consumed by every consequence-bearing mutation. Bind at least order/root identity, accepted attempt, target schema, producer, source watermark/vector, materialized derivation watermark, derivation epoch, and cohort/enrollment epoch. The mutation RPC must lock the aggregate, compare the proof to current accepted state, and reject stale/mismatched proof with the shared result vocabulary. State whether JIT orchestration is always two calls with this database-checked token or uses one named coordinator operation.

### 2. High — Pilot cohort enforcement is unspecified across routes, reads, actions, derivation, and enrollment

**Where:** AD-14 enable boundary and pilot language; deployment diagram; Open Activation Gates.

The spine requires an explicit production pilot cohort and says enrolled orders must be materialized before routes/actions activate, but it does not define the shared cohort predicate or where it is enforced. Independent epics could gate only navigation, gate task derivation, filter reads, or reject writes. UI-only gating would leave RPCs callable; derivation-only gating could expose pre-existing or successor tasks; order-level filtering could disagree with task/membership-level enrollment after replacement or correction successors.

**Required closure:** define one database-owned, versioned activation/enrollment predicate and require it in derivation, Workshop read models, task-context capability, and every Workshop mutation. Specify inheritance for memberships, replacement incarnations, correction successors, newly created post-boundary orders, and incidents. UI route guards should reflect—not own—the same predicate. Include denied-path privilege fixtures for out-of-cohort staff.

### 3. High — “Rollback” conflates emergency feature disable, application rollback, schema compatibility, and return to paper

**Where:** AD-14; mandatory rollback/repair package; deployment diagram; PRD §9–§10.

The defined emergency disable and authoritative refetch are recovery controls, not a complete deployment rollback contract. After existing writers are cut over and legacy DML is revoked, reverting to an older application may fail against expanded/contracted privileges or emit an unsupported envelope. Separately, “rollback to paper” creates physical work that the digital task/evidence model will not observe. The spine requires a procedure naming resume authority but does not bind:

- which deployed producer/schema versions remain accepted during rollback;
- whether old application releases may write after contract;
- whether migrations are backward compatible for a stated release window;
- whether the worker, ingestion, derivation, reads, and actions disable together or independently;
- how work performed on paper is reconciled before digital resume.

Independent deployment, integration, and Workshop epics can therefore implement mutually incompatible rollback assumptions.

**Required closure:** split four runbooks/gates: activation disable, worker/producer containment, application-version rollback, and operational return-to-paper. Define database compatibility windows and producer acceptance, switch ordering, data invariants, paper-work reconciliation/quarantine, who may resume each layer, and tests for a rollback from every rollout stage.

### 4. High — Paper retirement remains a subjective approval, not a reproducible architecture gate

**Where:** AD-14 final sentence; Open Activation Gates; PRD SM-1, SM-C1..SM-C3, §9 paper-retirement gate.

The architecture correctly keeps paper retirement separate from general activation, but it imports a PRD gate based on “comfortably,” “no material slowdown,” “usual bike categories,” and “no unpredictable” sync issues. There is no measurement owner, baseline method, observation window beyond one peak cycle, sample/completeness rule, tolerated defect bound, feedback instrument, or signed decision artifact. Different rollout epics can reach opposite approvals from the same pilot.

The risk is not merely product analytics. Paper is the operational fallback for missed or ambiguous digital work, so retiring it without a deterministic gate changes the safety model.

**Required closure:** bind a paper-retirement evidence contract: pilot start/end and cohort manifest, paper baseline, category/phase coverage, task and incident denominators, speed/quality/focus measures, explicit stop/extend/pass thresholds, unresolved-data treatment, approver roles, and retained approval record. Define an automatic no-go for missing/duplicate tasks and uncertain save/handoff state.

### 5. Medium — The envelope has no declared single editable source or generation direction

**Where:** AD-16; Structural Seed `src/lib/booqable/contracts`; AD-18 event/read contracts.

The spine says one repository-owned schema package is authoritative and “mirrored by generated/fixture-checked TypeScript/PostgreSQL representations.” It does not say whether the canonical source is JSON Schema, Zod, SQL composite/JSON validation, or another IDL, nor which representations are generated versus manually fixture-compared. Adapter and database epics can each believe their representation is authoritative and still supply passing local fixtures.

**Required closure:** name the canonical file/package and generation command, generated outputs, ownership, CI drift check, schema-version bump rules, compatibility matrix, and deprecation/removal gate. Apply the same rule to task-context and event catalogues.

### 6. Medium — `order_graph` completeness and source-version authority are schema words without a normative producer profile

**Where:** AD-4, AD-13, AD-16.

The envelope carries complete/partial scopes and a source-version map, but the spine does not bind which Booqable request/include/pagination profile may emit a complete `order_graph`, which resources must be present, or how each resource/relationship obtains authoritative source time. An adapter epic may mark an included relationship complete; an ingestion epic may expect separately paged collections or child versions. Comparator correctness then depends on incompatible assumptions.

**Required closure:** version the producer profiles alongside the envelope. For every admitted resource and relationship, define required fetch path, pagination/full-linkage proof, completeness rule, source-version extraction, explicit removed-state mapping, null/unknown behavior, and fingerprint inputs. Fixture every permitted profile; reject undeclared producer/profile combinations.

### 7. Medium — Brownfield read compatibility names consumers but does not bind their compatibility interface

**Where:** AD-3, AD-17; Structural Seed; current direct readers of `orders` and `customers`.

AD-17 says retained order items expose current/closed state and existing readers use “the filtered current contract,” but it does not name that contract as a view, table compatibility shape, RPC, or migration phase. Current consumers query shared relations directly. One epic can retain only current rows in `order_items`; another can keep closed rows and add a view; a caller epic can continue direct table reads and accidentally include closed data.

**Required closure:** define exact compatibility object names and column/nullability semantics for bookings, order detail, partner overview/customers/stats/reporting, and local-customer flows. State when direct-table access is replaced, how current/closed rows are filtered, and how compatibility aliases are removed. Contract tests should execute each named loader/report rather than only compare fixture rows.

### 8. Medium — Caller cutover has no authoritative caller manifest or cutover-completeness proof

**Where:** AD-14 sequencing; AD-17 authority manifest; Open Activation Gates.

The authority manifest classifies fields, not code callers. “Complete caller cutover” and “every existing writer plus one recovery entrypoint” do not identify a versioned list of webhook, backfill, operator, scheduled, script, and future service-role callers. DML revocation proves that missed legacy writers fail, but not that all required business paths continue to work. A missed recovery or script caller becomes a production outage discovered after contract.

**Required closure:** add a migration-owned caller/capability register mapping each old entrypoint to its replacement, authentication, envelope producer/profile, required grant, test, and retirement commit. Require repository search/static checks for direct authoritative DML plus executable smoke tests for every retained caller before revocation.

### 9. Medium — Incident severity and activation-blocking classification are not a shared versioned contract

**Where:** AD-10, AD-13..AD-16; Integration operations convention; AD-14 “blocking incidents.”

The spine defines incident identity/resolution but only informally calls high-severity derivation/security incidents “blocking.” It does not define stable incident types, severity assignment, escalation/de-escalation, environment/cohort/resource scoping precedence, or which incident types block pilot, general activation, and paper retirement. Adapter, ingestion, security, and operator UI epics can classify the same fault differently.

**Required closure:** create a versioned incident catalogue with producer, stable code, severity, deduplication scope, retryability, auto/manual resolution, activation impact by gate, and unknown-code fallback. Persist catalogue version and prohibit callers from choosing free-form severity.

### 10. Medium — Environment proof is detailed in content but not in artifact identity, promotion binding, or approval authority

**Where:** AD-14 mandatory proof; deployment sequence; Open Activation Gates.

The spine lists strong proof ingredients, but does not specify a durable proof manifest with exact deployed commit, migration set, contract versions, environment/project identity, cohort/epoch, timestamps, sweep boundaries, test outputs, unresolved exceptions, and approvers. “Staging disabled proof” and “production shadow/privilege proof” can become screenshots or ad hoc checklists that do not bind the evidence to the release being promoted.

**Required closure:** define a repository-owned environment-proof manifest schema and storage location. Require machine-collected identifiers and results, explicit exceptions with expiry/owner, signatures/approvals, and invalidation when commit, migration history, contract version, privileges, configuration, or cohort changes.

### 11. Medium — The architecture’s documentary closure gate is stale after the PRD amendments

**Where:** AD-6; AD-14; Open Activation Gates; current PRD FR-1/FR-3 and Setup mapping text.

The current PRD already adopts exact-StockItem-only multi-quantity behavior, incident-only shortfall, unconditional unassignment, and all-active-category Setup mapping/broad fallback. The spine still says the PRD “must be aligned” and lists FR-1/FR-3 amendment as open. This does not create a domain contradiction now, but it creates incompatible epic status: one stream can treat documentary closure as passed from the committed PRD, while another blocks decomposition waiting for a nonexistent future amendment.

**Required closure:** replace the stale gate with a dated documentary closure record citing exact PRD sections/commit and retain only the still-open business approvals and fixture proofs. Distinguish “decision documented” from “implementation/proof complete.”

### 12. Low — Rollout diagrams imply route/action activation ordering that the prose does not define

**Where:** deployment diagram and AD-14.

The diagram places dependent Workshop construction before staging proof and depicts general activation plus paper retirement as one node, while the prose says paper retirement is a separate approval and routes/actions require enrolled-order materialization. Diagrams are likely to be used for epic sequencing, so this compression can be read as a shared release gate.

**Required closure:** split general activation and paper retirement in the diagram, and show pilot-cohort derivation/read/action enablement as a database-enforced stage after cohort materialization and before general activation.

## Seam-by-Seam Assessment

### Booqable adapter → envelope

**Mostly closed.** The anti-corruption boundary, stable-ID classification, explicit unknown/removed semantics, no raw-payload authority, and fail-closed mapping are coherent. The remaining disagreement is producer-profile authority: completeness, pagination, source-version extraction, and the canonical editable schema source need binding.

### Envelope → ingestion → Workshop derivation

**Closed for ownership and atomicity; incomplete for version governance.** One coordinator owns source writes and invokes Workshop-owned derivation in the same transaction. `resource_batch` debt and `order_graph` derivation authority are explicit. The package-generation direction, allowed producer profiles, and incident catalogue remain underbound.

### Derivation → reads/actions

**Not closed for rollout.** Read minimization, RLS/capability boundaries, database calculations, revisions, and typed action results are strong. Pilot cohort enforcement and the JIT freshness proof consumed by mutation RPCs are missing shared contracts.

### Shared brownfield consumers

**Partially closed.** One projection, field authority, local/source customer separation, partner-map recomputation, and named consumers are correct. The filtered-current compatibility interface and complete caller register are not concrete enough to prevent direct-reader and cutover divergence.

### PRD documentary gates

**Semantics closed; status stale.** The PRD now contains the amendments the spine still calls open. The architecture needs a closure record so decomposition and activation checklists share one status.

### Environment proof, pilot, rollback, and paper retirement

**Not closed.** The sequence and proof categories are strong, but the proof manifest, cohort enforcement, incident-blocking catalogue, rollback compatibility model, paper-work reconciliation, and objective paper-retirement decision are not bound.

## Closure Gate

Do not let independent rollout, action, or caller-cutover epics treat this spine as fully decomposable until Findings 1–4 are resolved. Findings 5–11 can be closed by repository-owned contracts/manifests and acceptance tests before the affected epic begins; they do not require changing the transactional modular-monolith decision.

The architecture is otherwise internally coherent: no competing Workshop projection, alternate source writer, ordinal bike identity, absence-based deletion, or non-transactional derivation path remains.

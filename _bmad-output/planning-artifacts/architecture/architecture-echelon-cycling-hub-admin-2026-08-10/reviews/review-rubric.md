# Good-Spine Rubric Review — Workshop Tasks

**Reviewed:** 2026-08-18  
**Artifact:** `../ARCHITECTURE-SPINE.md`  
**Intent:** Validate only; the spine was not edited.  
**Verdict:** **NEEDS REVISION — no critical finding, but four high-severity seams can still produce incompatible epic implementations.**

## Evidence checked

- Approved MVP PRD (`prd.md`), addendum, and 2026-08-18 sprint-change proposal.
- Brownfield project context and the shipped canonical adapter, coordinator, webhook, legacy `sync.ts`, and preview-ingestion guard.
- The good-spine checklist: real feature-level divergence points, enforceable ADs, safe deferral, source coverage, brownfield ratification, and all structural dimensions including operations.
- Deterministic spine lint: **pass** — no placeholders, duplicate/non-monotonic AD IDs, missing AD fields, or unpinned stack rows.

## Critical

None.

## High

### H1 — The source-to-Workshop derivation transaction is not owned by one enforceable seam

**Affected:** AD-2, AD-4, AD-5, AD-16; FR-4, FR-6, FR-15, FR-18, FR-21.

AD-2 says every multi-row Workshop mutation is a named PostgreSQL RPC entered through a `withAuth` action. That cannot govern source-driven task creation/cancellation/replacement/reconfirmation: `apply_canonical_order_graph` is service-role-only, and webhook ingestion has no authenticated staff actor. AD-4 then says to fetch and apply, while AD-5 says that an assignment creates/cancels/replaces a task, but neither decision names the database coordinator that derives those Workshop changes or requires that it share the canonical-apply transaction.

Independently built live-wiring and task-lifecycle epics could therefore choose incompatible implementations: post-apply application code, an eventual trigger, a separate service action, or a second RPC. Those choices differ on duplicate deliveries, claim races, and whether canonical state can commit while task state does not.

**Required disposition:** amend the spine to name one service-only database coordinator/transaction boundary for canonical apply plus Workshop derivation. It must state exactly which canonical apply results may derive state, make task identity uniqueness and close/open transitions atomic, and explicitly exempt source ingestion from the interactive `withAuth` rule while retaining authenticated actor derivation for staff commands.

### H2 — Return eligibility does not require releasing the prior assignee atomically

**Affected:** AD-6, AD-8, AD-9; FR-18, FR-19.

AD-6 says a returned actionable task makes Return Check “the only actionable work,” but it only explicitly clears assignment for cancellation, replacement, force-close, and Done. FR-18 requires a returned task to become claimable through Available Now; that requires clearing any M1/M2 owner and transitioning to unassigned `Needs Return Check`.

Without an explicit transition rule, one implementation can retain the Prep/Re-check owner and move to `In Return Check`, while another releases the task to Available Now. Both can read AD-6 as compliant, but only the latter satisfies the PRD and preserves first-writer-wins Return claim semantics.

**Required disposition:** amend AD-6/AD-8 to require one atomic return transition: clear active assignment, preserve unfinished Prep/Re-check history, create the Return Snapshot, set `Needs Return Check`, emit attributed history, and increment the task revision. State the idempotent behavior for repeated returned refreshes.

### H3 — NFR-7 is only named in a map, not bound as an implementation invariant

**Affected:** NFR-7; AD-9, AD-12, AD-19.

The capability map associates NFR-7 with audit/security ADs, but no AD prohibits offline completion, client-side mutation queues, service-worker replay, or presenting cached task state as writable. AD-19 bans source-recovery infrastructure, not Workshop offline functionality. A queue/UI epic could independently add “resilient offline saves” and violate the approved online-only product boundary while appearing compatible with the current rules.

**Required disposition:** add an enforceable online-only rule: mutations require a live authenticated request and authoritative server confirmation; client storage may retain unsaved input only for the current open session, must not queue/replay commands, and cached/offline task data must not be presented as claimable or completable.

### H4 — AD-14 contradicts the real preview-secret model and omits the webhook execution budget

**Affected:** AD-14; brownfield deployment/operations; FR-21.

AD-14 says preview deployments “receive no Booqable or service-role credentials.” Brownfield reality is deliberately different: previews can inherit project secrets, and `isBooqableIngestionAllowed()` refuses ingestion when `VERCEL_ENV === "preview"` even if secrets are present. The actual security invariant is runtime refusal, not guaranteed credential absence. The same project context makes the Vercel Hobby 10-second function cap a hard webhook design constraint, which AD-14 does not bind.

This is both a brownfield contradiction and an operational seam: a wiring epic could remove the runtime guard because it trusts the spine’s incorrect deployment assertion, or introduce a fetch/retry path that exceeds the webhook budget.

**Required disposition:** replace the credential-presence assertion with the tested runtime invariant—preview ingestion is denied regardless of inherited credentials—and bind the 10-second Vercel limit plus bounded failure behavior for the signal-only webhook. Deployment credential minimization may remain a desired environment policy, but not a claimed enforced fact.

## Medium

### M1 — Source traceability is internally inconsistent about FR-22

The approved PRD contains FR-22 (shared latest-value Notes), and multiple ADs and map rows correctly bind it. However, the spine frontmatter claims only `FR-1..FR-21`; the addendum also says current IDs end at FR-21. This makes the declared source coverage false and leaves downstream reviewers with two incompatible requirement sets.

**Disposition:** align the PRD addendum and spine metadata to `FR-1..FR-22`, or formally retire/renumber FR-22 in the PRD. This is traceability drift rather than a missing Notes architecture decision.

### M2 — AD-4 conflates webhook and claim failure handling

“A failed refresh returns a visible error” is enforceable for a claim action, but not for an asynchronous webhook caller. The webhook needs a specific HTTP/logging contract—currently an error is logged and a 500 is returned so Booqable may redeliver—while the claim needs a discriminated user-visible result. The present wording risks one implementation swallowing a webhook failure or trying to produce user-facing feedback where no user exists.

**Disposition:** split the rule by caller: claim returns `{ ok: false, error }` without claiming; webhook logs with its existing context prefix and returns a retryable failure response. Keep both on the same fetch-and-apply boundary.

### M3 — “Relevant source change” is safely deferred, but lacks an ownership/test seam

The Deferred default (“any task-context-visible change”) is safe and matches PRD question 2, but the spine does not name where the before/after comparison and test fixture live. The likely contenders are the frozen canonical adapter, the source-to-Workshop derivation coordinator, and a task-detail loader; choosing differently changes whether a no-op source apply can set reconfirmation.

**Disposition:** retain the deferred field list, but add a convention that the future explicit predicate is owned and regression-tested at the source-to-Workshop derivation boundary from H1, never recomputed independently in UI loaders.

## Good-spine checklist result

- **Real feature-level divergence points:** **Needs revision.** Source derivation, Return ownership, and online-only behavior remain open divergence points.
- **AD enforceability and stated prevention:** **Needs revision.** AD-2 cannot literally govern service-role source mutations; AD-6 and the NFR-7 map lack rules that prevent their stated/product divergences.
- **Deferred safety:** **Pass with M3.** The listed deferred items are bounded non-goals or have a safe default; the relevant-change predicate needs a named future owner.
- **Brownfield ratification:** **Needs revision.** AD-14’s preview credential assertion conflicts with the existing preview-denial guard and its documented rationale. The rest of the spine appropriately preserves the canonical adapter, `sync.ts`, brownfield readers, local-customer behavior, RLS, and CI-only remote migrations.
- **Source coverage:** **Substantively covered, traceability needs revision.** FR-1..FR-22 and NFR-1..NFR-6 have material architectural coverage. NFR-7 lacks a binding rule. The PRD/addendum/frontmatter disagree on whether FR-22 exists.
- **Technology fit:** **Pass.** The stack matches the current project context and the mechanical pin check passes.
- **Structural breadth, including operations:** **Needs revision.** CI/local verification and rollout/recovery non-goals are decided, but preview ingestion enforcement and the webhook execution-time constraint must be stated as operational invariants.
- **Inherited parent spine:** **Not applicable.**

## Review conclusion

The rewrite removes the rejected enterprise lifecycle, rollout, and source-recovery architecture and successfully centers the MVP on the frozen canonical boundary, manager-assigned bikes, atomic staff workflow changes, task history, and a small lifecycle. It is not yet a safe build substrate for independently implemented Epic 2/3/6/8 work: resolve H1–H4 before decomposing those seams. The deferred list is otherwise appropriate for the approved MVP.

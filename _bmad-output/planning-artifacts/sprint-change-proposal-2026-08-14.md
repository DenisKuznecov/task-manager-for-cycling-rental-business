---
title: Sprint Change Proposal — Workshop Source Classification
date: 2026-08-14
status: approved-in-implementation
change_scope: major
recommended_approach: hybrid-rollback-and-direct-adjustment
approved_by: Den
---

# Sprint Change Proposal — Workshop Source Classification

## 1. Issue Summary

Story 2.5 implemented an empty, locally approved ProductGroup UUID allowlist and an Admin classification screen before the real source-classification rule was settled. The approved product direction is now source-first:

- Booqable `tag_list` is authoritative for Workshop bike classification.
- ProductGroup bike tags are exactly `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, and `workshop-e-mtb-bike`.
- Bundle tags are the corresponding `workshop-*-bike-bundle` values and must agree with the contained bike ProductGroup.
- Product, ProductGroup, and Bundle tags are persisted as source facts; exact StockItem identity remains the Bike Task identity.
- Untagged entities create no Workshop work. Unknown, multiple, or conflicting Workshop tags fail closed with an Integration Incident.
- Accessory tags remain uninterpreted until Epic 6. Broad `review_updated_configuration` is the initial safe configuration-change behavior.

Evidence:

1. Booqable API v4 documents `tag_list` on ProductGroups, inherited Products, and Bundles.
2. Commit `0db741b` added 3,533 lines for an empty allowlist, approval RPCs, and `/workshop/classification`, but its own verification notes state that nothing classifies live ProductGroups.
3. The route has no navigation entry, the allowlist is empty, and existing writers do not consume the configuration.
4. Current uncommitted changes are follow-up refactors inside that same superseded classification surface; they must be inspected and removed explicitly rather than reset destructively.

## 2. Impact Analysis

### Epic Impact

- Epic 1 keeps checklist governance but supports six categories by adding E-MTB.
- Epic 2 withdraws current Story 2.5, renumbers current Stories 2.6–2.10 to 2.5–2.9, and adds Story 2.10 “Seed and Validate Workshop Source Data” after atomic ingestion.
- Epic 3 Story 3.1 consumes authoritative ProductGroup/Bundle tags instead of a local UUID allowlist.
- Epic 6 Story 6.2 owns later accessory-tag interpretation and any targeted invalidation mapping. Broad review is the initial mode.
- Epics 4–5 and 7–9 retain their outcomes, with references updated where they mention an allowlist or mapping-choice activation gate.

### Story Impact

- Withdraw implemented Story 2.5 and mark its spec superseded.
- Remove `/workshop/classification`, `src/lib/booqable/classification-config`, its contract/check files, migration, pgTAP proof, and unit/UI tests.
- Remove the classification drift check from package and CI commands.
- Preserve the generic source-envelope contract and add a focused source-tag contract with fail-closed classification behavior.
- Add E-MTB to checklist TypeScript vocabulary and PostgreSQL constraints through a new idempotent local migration.
- Update sprint tracking for the renumbered Epic 2 sequence.

### Artifact Conflicts

- **PRD:** five-category template scope, UUID-allowlist assumptions, and pre-Epic-6 targeted mapping language conflict with source authority.
- **Architecture:** AD-3, AD-13, AD-14, activation gates, and proof language depend on an Active local allowlist snapshot.
- **UX:** template coverage lists five categories and does not explicitly rule out a duplicate Workshop classification screen.
- **Project context:** currently tells implementers that runtime reads an Active local classification snapshot.
- **Historical reviews/research:** retain unchanged as evidence; the current-authority index prevents them from competing with corrected artifacts.

### Technical Impact

- No remote database operation is permitted.
- The obsolete classification migration is removed because it exists only on the feature branch and has not entered staging/production history.
- A new idempotent migration updates the existing checklist category constraints to include `e-mtb`.
- Local reset/migration, pgTAP, contract, unit, lint, and type checks prove the corrected state.

## 3. Recommended Approach

### Selected Path: Major Hybrid

Use a rollback plus direct adjustment:

1. Explicitly remove the feature-branch-only classification implementation and its inspected uncommitted follow-ups.
2. Directly update the authoritative planning package to the source-first contract.
3. Add the six-category checklist migration and source-tag contract.
4. Re-run implementation readiness and implementation verification.

This is preferable to preserving a compensating classification migration because no remote environment has received the obsolete migration. It also avoids retaining a second classification authority that could drift from Booqable.

- Effort: high
- Risk: medium
- Timeline impact: one correction and verification cycle before continuing Epic 2
- MVP impact: no reduction; E-MTB and source truth become explicit

## 4. Detailed Change Proposals

### PRD

#### Bike category authority

OLD:

> Runtime identity must not depend on line title or ProductGroup label.

NEW:

> ProductGroup `tag_list` is the category authority. Exactly one controlled Workshop bike tag admits the bike category; exact StockItem external identity remains the Bike Task identity. Untagged entities create no Workshop work, while unknown, multiple, or conflicting Workshop tags fail closed with an Integration Incident.

#### FR-11 template coverage

OLD:

> e-city, e-road, road, gravel, and MTB bikes

NEW:

> e-city, e-road, road, gravel, MTB, and E-MTB bikes

#### Configuration interpretation

OLD:

> Targeted invalidation depends on an approved complete Setup Category mapping version selected before integration implementation.

NEW:

> V1 persists admitted source tags and uses broad `review_updated_configuration` for relevant configuration changes. Epic 6 may interpret accessory tags or other stable source identifiers only after complete fixture-backed evidence exists.

### Architecture

#### AD-3 canonical projection

OLD:

> The integration boundary admits business-approved ProductGroups/Products and fixture-proven Bundles.

NEW:

> The integration boundary admits tagged ProductGroups/Products and matching tagged Bundles, persists each admitted resource's `tag_list`, and keeps tags as one-way Booqable source facts.

#### AD-13 mapping boundary

OLD:

> Bike classification uses immutable business-approved allowlist versions keyed by actual ProductGroup UUID.

NEW:

> Bike classification uses the controlled Booqable ProductGroup tag vocabulary. ProductGroup and Bundle tag agreement is validated; untagged entities create no work; unknown, multiple, or conflicting Workshop tags create an incident and no work. Product/Bundle/ProductGroup tag lists are persisted. Accessory-tag interpretation is reserved for Epic 6.

#### Runtime dependency

OLD:

> Production activation requires an approved Active local classification snapshot.

NEW:

> Production activation requires source data seeded and validated against the controlled tag vocabulary, plus fixture proof for ProductGroup/Product/Bundle persistence and bundle agreement.

### UX

OLD:

> Separate Prep and Return versions exist for e-city, e-road, road, gravel, and MTB.

NEW:

> Separate Prep and Return versions exist for e-city, e-road, road, gravel, MTB, and E-MTB. Workshop does not provide a second classification/configuration screen; classification is read-only Booqable source context.

### Epics and Stories

#### Epic 2 sequence

OLD:

> 2.5 Approve Bike Classification and Setup Mapping Configuration  
> 2.6 Expand the Canonical Booqable Projection  
> 2.7 Preserve Brownfield Projection Consumers  
> 2.8 Persist and Recover Authoritative Refresh Work  
> 2.9 Run Bounded Workers and Reconciliation Sweeps  
> 2.10 Apply Canonical Source State Atomically

NEW:

> 2.5 Expand the Canonical Booqable Projection  
> 2.6 Preserve Brownfield Projection Consumers  
> 2.7 Persist and Recover Authoritative Refresh Work  
> 2.8 Run Bounded Workers and Reconciliation Sweeps  
> 2.9 Apply Canonical Source State Atomically  
> 2.10 Seed and Validate Workshop Source Data

Story 2.10 proves the six ProductGroup tags, six corresponding Bundle tags, Product/ProductGroup inheritance, bundle agreement, persistence, untagged exclusion, and incident behavior for unknown/multiple/conflicting Workshop tags.

#### Story 3.1

OLD:

> A trackable ProductGroup outside the approved UUID allowlist creates an incident.

NEW:

> Derivation consumes the persisted authoritative ProductGroup tag. Exactly one controlled bike tag determines category; untagged work is excluded; unknown/multiple/conflicting tags or bundle disagreement create an incident; StockItem identity remains exact and independent of the tag value.

#### Story 6.2

OLD:

> Admin activates the targeted mapping configuration when all five slots are proven.

NEW:

> Broad review is the initial mode. Story 6.2 may introduce accessory-tag interpretation and targeted mapping only after every active Setup Category has stable source identifiers and complete null/unknown/changed/removed fixtures. No classification approval screen is introduced.

## 5. Implementation Handoff

### Scope Classification

**Major.** Product, architecture, UX, backlog, implemented feature-branch code, and local schema history all change together.

### Recipients and Responsibilities

- Product Manager / Solution Architect: own the corrected source-authority decision and artifact consistency.
- Product Owner / Developer: apply story renumbering, sprint-status reconciliation, implementation removal, source-tag contract, and E-MTB migration.
- Developer verification: run local-only database and application proof and stop if the corrected package is not READY.

### Success Criteria

- one authoritative Booqable tag vocabulary covers six bike categories and corresponding bundles;
- no `/workshop/classification` route, local approval snapshot, classification RPC, or obsolete migration remains;
- all inspected uncommitted classification follow-ups are removed through explicit file edits/deletions;
- Product/ProductGroup/Bundle tags are represented as source facts and bundle/category disagreement fails closed;
- E-MTB is accepted by TypeScript, UI filters, database constraints, and tests;
- accessory interpretation remains deferred to Epic 6 and broad review remains the initial behavior;
- sprint status and story references match the corrected Epic 2 sequence;
- no staging or production database is touched;
- the corrected planning package receives a new READY implementation-readiness assessment.

## 6. Checklist Record

### Understand the Trigger and Context

- [x] 1.1 Story 2.5 identified as the triggering implementation.
- [x] 1.2 Problem classified as a failed premature approach plus clarified product authority.
- [x] 1.3 Booqable docs, commit contents, empty runtime state, and unconsumed route/config recorded as evidence.

### Epic Impact Assessment

- [x] 2.1 Epic 2 remains viable after story withdrawal and resequencing.
- [x] 2.2 Story 2.10 added for source-data seeding/validation.
- [x] 2.3 Epics 1, 3, 6, and 9 require bounded changes; other epics retain outcomes.
- [x] 2.4 No epic is obsolete and no new epic is needed.
- [x] 2.5 Epic order is unchanged; Epic 2 internal priority is corrected.

### Artifact Conflict and Impact Analysis

- [x] 3.1 PRD conflicts identified; MVP remains achievable.
- [x] 3.2 Architecture source authority, projection, proof, and activation sections identified.
- [x] 3.3 UX gains E-MTB and explicitly excludes a duplicate classification screen.
- [x] 3.4 Code, migration, tests, CI, project context, spec, sprint status, and readiness report identified.

### Path Forward Evaluation

- [x] 4.1 Direct adjustment is viable for artifacts, source contract, and category support.
- [x] 4.2 Feature-branch-only rollback is viable and simpler than preserving dead schema/UI.
- [x] 4.3 MVP review completed; no scope reduction is required.
- [x] 4.4 Major hybrid rollback plus direct adjustment selected.

### Sprint Change Proposal Components

- [x] 5.1 Issue summary complete.
- [x] 5.2 Epic and artifact impacts complete.
- [x] 5.3 Recommended path and alternatives complete.
- [x] 5.4 MVP impact, sequencing, and local-only migration rule complete.
- [x] 5.5 PM/Architect/PO/Developer handoff defined.

### Final Review and Handoff

- [x] 6.1 Applicable checklist sections reviewed.
- [x] 6.2 Proposal checked against the approved plan.
- [x] 6.3 Explicit approval received from Den on 2026-08-14 through the instruction to execute the approved plan.
- [!] 6.4 Sprint status must be reconciled during implementation.
- [x] 6.5 Handoff and success criteria confirmed by the approved execution request.

## 7. Approval Record

- Decision: **Approved**
- Approved by: Den
- Approval date: 2026-08-14
- Mode: Batch
- Authorized scope: artifact correction, explicit classification rollback, source-tag contract, E-MTB local migration, tests, and readiness rerun
- Database boundary: local Supabase only; remote DDL remains merge-driven CI

# Booqable Selective-Warehouse Technical Spike Handover

## Purpose

Determine whether a continuously refreshed, selective local projection of Booqable data can provide stable identities and relationships for reliable workshop tasks without creating an expensive, brittle full mirror.

The current integration receives a flat order-updated webhook, extracts the Booqable order ID, fetches the canonical order and related customer, bike, and accessory data, and saves selected customer data locally. There is no ground-zero reconciliation of all relevant records. Workshop-task design is therefore weakest around stable item identity, detecting item changes, and avoiding fragile item-title parsing.

This spike is a time-boxed evidence gate, not a product commitment. Its duration was not defined in the workshop and must be agreed before work begins.

## Accepted direction

Use a bounded anti-corruption layer—a **selective warehouse**, not a full Booqable mirror:

- Preserve Booqable IDs and required source relationships.
- Translate selected source fields into app-owned, stable concepts and semantics.
- Keep Booqable authoritative for order changes, customer management, and inventory CRUD.
- Keep projected source fields one-way and read-only in the app.
- Admit an entity only when a concrete local workflow depends on it.
- Archive synchronized Booqable entities instead of hard-deleting them so historical references survive.
- Apply individual physical-asset identity and history to bikes only.
- Use webhooks as change signals, fetch the canonical entity from Booqable, and idempotently upsert or archive the affected projection.
- Provisionally target layered freshness: webhook-driven targeted refresh, nightly paginated reconciliation, and just-in-time order refresh before consequential workshop transitions.

Candidate source concepts justified by current workflows are orders, customers, inventory/catalog definitions, bundles and bundle composition, order lines, physical bikes, bike identifiers, and bike-to-order assignments. Exact Booqable resource names and API relationships are unknown until verified.

## Workshop sequencing

A separate agent is finishing the workshop-tasks architecture from the existing PRD and UX. Let that draft finish unchanged and treat it as the current-integration baseline. Pause workshop epics and implementation after that draft until this spike is complete and its evidence has been compared with the baseline. Only then decide whether a formal correct-course and architecture update is warranted.

## Non-negotiable boundaries

- Do **not** modify the existing workshop PRD, UX, or architecture artifacts during this spike.
- Do **not** modify remote staging or production databases.
- Do **not** create, change, or delete remote webhook subscriptions, including existing production subscriptions.
- Local-only representative prototypes and experiments are allowed.
- Do not write projected Booqable fields back to Booqable or introduce bidirectional synchronization.
- Do not infer missing bike identities or assignments from item titles. Missing trustworthy identifiers remain explicitly unknown.
- Do not copy the full Booqable API schema into the product model.
- Do not treat source-data feasibility as approval to build the feature.
- Do not invent API behavior, event coverage, identifiers, limits, or relationships; verify and record them.

## Explicit exclusions

- Full Booqable mirroring.
- Full coupon-catalogue synchronization.
- Partner promo-code history; the current partner feature remains outside this scope.
- Per-physical-item history for non-bike products.
- Workshop epics or implementation.
- Production-ready synchronization operations UI.
- Remote data import, migration, subscription setup, or deployment.

## Accepted MoSCoW spike scope

### Must

- Verify which stable Booqable IDs and relationships are exposed for the workshop-critical graph: orders, customers, inventory/catalog definitions, bundles and composition, order lines, physical bikes, bike identifiers, and bike-to-order assignments.
- Verify whether current, completed, and archived orders retain exact physical-bike identifiers and relationships.
- Measure historical bike-to-order reconstruction coverage using exact identifiers only; preserve unavailable associations as unknown.
- Verify create, update, and archive webhook coverage for every required resource, especially physical stock items and product update/archive paths whose coverage is currently unclear.
- Demonstrate locally that canonical fetch-after-webhook can drive an idempotent, targeted upsert or archive.
- Demonstrate a local paginated backfill/reconciliation path that upserts by Booqable ID, can checkpoint, can retry safely, and reports counts and gaps.
- Assess pagination behavior, expected runtime, and operational fit at the known approximate scale: 350 orders, 250 customers, 63 rental/service product definitions, and 13 bundles.
- Test the authority boundary: Booqable-owned fields remain read-only projections while app-owned workflow records and links remain separate.
- Produce evidence and a go / conditional-go / no-go recommendation.

### Should

- Determine how entities without complete webhook coverage can stay current through nightly reconciliation.
- Assess the proposed just-in-time order refresh before consequential workshop transitions.
- Validate an approach for durable webhook-event states—received, processing, succeeded, and failed—with identity, attempts, error context, and safe retry.
- Define the minimum observable sync health needed later: last successful run per entity, failed-event count, error details, and manual retry.
- Identify how archived customer records should preserve historical references while addressing the unresolved possibility that deleted-customer PII may need anonymization.
- Outline, without applying remotely, a repository-owned environment-specific webhook subscription manifest and repeatable setup/audit process with secret URLs kept in environment variables.

### Could

- Prototype only the workshop-critical vertical slice rather than every candidate projection.
- Compare representative reconciliation and targeted-refresh behavior under duplicate, delayed, missed, and out-of-order event scenarios.
- Sketch the later manually dispatched GitHub Action operating model for staging/production data-only reconciliation; do not run it or change remote systems.

### Won't

Anything listed under **Explicit exclusions**, plus any entity or field that lacks a demonstrated local workflow dependency.

## Technical hypotheses and unknowns to verify

1. **Identity and relationships:** Booqable may expose stable IDs and sufficient relationships to replace item-title parsing. The exact identifiers, endpoints, payloads, and relationship shapes are unknown.
2. **Historical bike assignments:** Older completed or archived orders may retain physical-bike identifiers. Coverage and trustworthiness are unknown; partial history is acceptable if reported transparently.
3. **Webhook coverage:** Documentation appears to expose create/update/archive events for bundles, bundle items, customers, orders, and product groups. Physical stock-item events and product update/archive coverage are unclear and require verification.
4. **Webhook reliability:** Events can be missed, delayed, duplicated, or delivered out of order. Verify that canonical fetch plus idempotent writes and periodic reconciliation can repair these conditions.
5. **Reconciliation:** A paginated, checkpointed, safely retryable importer is hypothesized to support both initial backfill and recurring repair. API pagination semantics and deletion/archive discovery are unknown.
6. **Runtime and capacity:** Current volume suggests database storage is unlikely to be the limiting constraint. API pagination, completeness, webhook coverage, and execution duration are more material. Full reconciliation should be evaluated outside a Vercel request; each webhook should remain bounded to a canonical fetch and targeted write.
7. **Freshness:** Nightly reconciliation plus just-in-time order refresh is provisionally acceptable for workshop operations, but must be validated against observed API and event behavior.
8. **Source authority:** Verify that selected Booqable fields can remain source-authoritative and read-only while app-owned workflow data and stable links evolve independently.
9. **Archival:** Verify how archive/deletion states are exposed and how retained identity snapshots should behave. Customer PII treatment remains unresolved.
10. **Subscription ownership:** Existing local-ngrok and production order subscriptions were created by ad hoc terminal commands and have no repository-owned record. Auditability can be designed, but remote subscriptions must not be touched in this spike.

## Required spike outputs

1. A verified source-graph report listing each required concept, observed Booqable ID, relationship, lifecycle/archive behavior, pagination behavior, and evidence; unknowns must remain explicit.
2. A webhook coverage matrix for required resources and lifecycle events, with unsupported or undocumented paths clearly marked.
3. A historical bike-assignment coverage report: exact associations found, orders lacking trustworthy identifiers, and the resulting reconstruction percentage/counts.
4. A local representative prototype or executable proof for:
   - paginated idempotent backfill/reconciliation with checkpoint/retry/count reporting;
   - canonical fetch-after-event and targeted upsert/archive;
   - duplicate and out-of-order safety where testable locally.
5. Runtime and capacity observations at representative scale, including why reconciliation should or should not stay outside Vercel.
6. A proposed authority/model boundary separating read-only Booqable projections, app-owned workflow records, and stable links.
7. A gap and risk register covering webhook gaps, stale-data repair, historical incompleteness, archival/PII, and operational visibility.
8. A comparison against the finished current-integration workshop architecture baseline, without editing that baseline.
9. A final go / conditional-go / no-go recommendation and the smallest justified next lifecycle step.

## Decision gate

No numeric acceptance thresholds were established in the workshop; do not fabricate them. Base the gate on the evidence below and report measured coverage explicitly.

### Go

Recommend **go** when the workshop-critical graph exposes stable IDs and trustworthy current relationships; exact bike assignments can be used without title parsing; local paginated reconciliation and targeted idempotent refresh work reliably; webhook gaps can be repaired by the accepted layered-freshness model; and the source-authority boundary remains bounded and maintainable.

### Conditional go

Recommend **conditional go** when the current workshop-critical graph is viable but one or more bounded gaps remain—for example incomplete historical bike assignments or incomplete webhook coverage—provided those gaps are explicit, historical unknowns are not inferred, nightly reconciliation can prevent indefinite staleness, and a narrower workshop-critical vertical slice can proceed safely.

### No-go

Recommend **no-go** when Booqable does not expose stable identities or required current relationships for reliable workshop tasks; current bike assignments would still require item-title inference; archive/deletion or pagination behavior prevents safe reconciliation; missed/unsupported events cannot be repaired acceptably; representative synchronization cannot operate within a practical bounded model even outside Vercel requests; or the projection would require bidirectional writes, full-schema mirroring, or unbounded Booqable coupling.

## Ready-to-paste kickoff prompt

> Run the time-boxed Booqable selective-warehouse technical discovery spike described in `_bmad-output/brainstorming/brainstorm-booqable-data-mirror-2026-08-10/technical-spike-handover.md`.
>
> Treat that handover as the scope and decision contract. Verify all Booqable API IDs, relationships, lifecycle states, pagination behavior, and webhook coverage from evidence; do not assume undocumented facts. Focus on the workshop-critical source graph, historical physical-bike assignments, idempotent canonical fetch-after-event, paginated reconciliation, layered freshness, runtime constraints, and the one-way source-authority boundary.
>
> You may build local-only representative prototypes. Do not modify existing workshop PRD, UX, or architecture artifacts. Do not modify staging/production databases or any remote webhook subscription. Do not infer missing bike assignments from item titles. Keep unknowns explicit.
>
> Produce every required spike output, compare findings with the completed current-integration workshop architecture baseline without editing it, and finish with an evidence-backed go / conditional-go / no-go recommendation. Do not proceed to epics or implementation.

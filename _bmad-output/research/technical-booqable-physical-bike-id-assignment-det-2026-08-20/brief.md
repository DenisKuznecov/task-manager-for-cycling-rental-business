# Research Brief

## Topic

Booqable physical bike ID assignment detection.

## Decision

Choose the smallest reliable integration mechanism that detects when a specifically identified physical bike is assigned to, removed from, or replaced on a reserved Booqable order, so the application can create or invalidate one local task per physical bike.

## Scope

- Determine whether any Booqable webhook reliably emits physical product assignment changes.
- Identify the API endpoint and fields that expose the current physical bike assignment.
- Compare event-driven, polling, and reconciliation-triggered detection strategies.
- Establish relevant authentication, rate-limit, pagination, ordering, retry, and consistency constraints.
- Recommend a minimum viable trigger and reconciliation design, including how to detect bike-ID replacement.

## Known Project Observation (Context, Not Evidence)

The current order-update webhook reportedly does not fire when a physical bike ID is added. If a later order change does trigger that webhook, its payload reportedly includes the assigned bike ID. This observation shapes the spike questions and must not be treated as verified Booqable behavior without external evidence or a controlled test.

## Out of Scope

- Full checklist or task-domain architecture.
- Workforce assignment.
- Automatic pickup or return transitions.
- Implementing the integration.

## Research Method

Straightforward technical spike, standard preset pruned to at most eight sources and two rounds, normal validation, official Booqable documentation prioritized.

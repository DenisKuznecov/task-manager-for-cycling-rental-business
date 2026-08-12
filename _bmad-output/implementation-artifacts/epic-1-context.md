# Epic 1 Context: Manager-Defined Workshop Standards

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Establish manager-governed, versioned Prep and Return checklist standards for each supported bike category before operational Bike Task work begins. Admins and Managers need a secure way to see the current standard, author a replacement without disrupting active work, validate its structure, activate it for future use, and restore a prior standard while preserving a complete, immutable history. This creates stable checklist language that later Bike Tasks can snapshot without retroactively changing recorded work.

## Stories

- Story 1.1: Browse Governed Workshop Checklist Templates
- Story 1.2: Create a Draft Checklist Version
- Story 1.3: Configure Draft Checklist Items
- Story 1.4: Activate an Immutable Template Version
- Story 1.5: Reactivate and Review Template History

## Requirements & Constraints

- Support separate Prep and Return templates for e-city, e-road, road, gravel, and MTB categories. A template version belongs to one phase/category pairing and has a server-assigned, monotonically ordered version number within that pairing.
- A version moves through Draft, Active, and Superseded states. Drafts are editable; Active and Superseded definitions are readable but immutable. Referenced versions cannot be deleted, and historical records must remain available for review.
- The Template Library must provide an authoritative, server-loaded view of phase, bike category, version, and textual status. Phase, category, and status filters belong in URL search parameters so links and refreshes preserve the selected view. Filtering, sorting, and status resolution must be performed by a PostgreSQL read model or RPC rather than client-side aggregation.
- Show a specific empty state only after a successful zero-result load. A failed load must return safe empty data with an error, log a contextual failure, and render an in-context retry affordance. Missing or expired sessions redirect through the established authentication boundary rather than appearing as a data error.
- Only authenticated Admins and Managers may read or mutate template data. RLS and narrow database capabilities are the authorization boundary; client-side role visibility, direct table writes, and service-role access are not substitutes. Mechanic and Partner access must be denied consistently.
- Creating a draft starts from the selected Library phase/category, creates a blank valid definition without requiring Items, and redirects directly to its persisted detail route. Allocate the version number and record the attributed creation event atomically; concurrent creations must not collide, overwrite, or merge.
- Draft Items may define label, order, Action or Value type, required state, M1 applicability, M2 applicability, and an optional supported Setup Category link. M2 applicability requires M1 applicability. Validate complete reorders transactionally and reject duplicate positions, missing Items, and stale revisions without a partial update.
- Setup Category links provide grouping, current context, and selective invalidation metadata only. They never control Item visibility and incomplete Setup Category coverage must not prevent activation.
- Activation and reactivation affect only future phase snapshots. Existing Bike Task snapshots, outcomes, progress, and history must never be altered. Activating a structurally valid draft or reactivating a superseded version leaves exactly one Active version for its phase/category and atomically supersedes the prior Active version.
- All user-visible mutations need explicit pending, confirmed-success, retryable-failure, and stale-conflict behavior. Do not claim a save or status change before the server returns the authoritative result. Expected validation and authorization failures use stable returned errors; unexpected failures are contextually logged.

## Technical Decisions

- Model templates as a template-to-version relationship, with versions owning their Item definitions. The planned model includes `workshop_checklist_templates`, `workshop_checklist_versions`, and `workshop_checklist_items`; later Bike Task Items consume immutable version snapshots rather than live definitions.
- Use UUID primary identities, constrained supported phases/categories, explicit version status, creator and timestamps, and revision values for stale-write protection. Keep normalized current state for reads and write append-only attributed events in the same transaction as each accepted domain change.
- Implement privileged operations as narrowly scoped transactional database capabilities. Creation, Item mutation, activation, and reactivation must validate authorization, input, expected revision/status, and all affected data before committing; direct DML and direct event writes are revoked from application roles.
- Serialize activation, reactivation, and future snapshot selection with the same transaction advisory lock derived from `(bike_category_id, phase)`. Re-read the requested version and active pointer while holding that lock, and enforce a database uniqueness constraint so a phase/category can never have more than one Active version.
- Structural activation validation rejects invalid Item type/applicability combinations, especially M2 without M1, but does not impose Setup Category coverage as a gate. A stale activation or reactivation returns current authoritative state without changing pointers, statuses, or events.
- Keep history append-only and attributable: creation, Item changes, activation, and reactivation record the authenticated actor, time, phase, category, relevant versions, and resulting revisions atomically. Immutable versions and their Items are never rewritten to make history appear different.
- Follow existing application boundaries: server actions authenticate through `withAuth`, return discriminated expected failures, and explicitly revalidate each affected Library and detail route after a successful mutation. Loaders return safe fallback data plus an error field.
- Use idempotent local database migrations and restrictive privileges. Prove behavior locally across valid, invalid, unauthorized, stale, concurrent, and rollback paths, including effective-role access and advisory-lock behavior.

## UX & Interaction Patterns

- Use a Library/detail split: the Library supports scan-oriented review of versions and their textual state, while the detail view exposes definition metadata and Items. Historical versions remain fully readable and must not be styled as disabled or failed content.
- Create Draft is available from the selected phase/category Library context and navigates directly to the newly persisted draft. A draft with no Items is a valid empty-definition state, not a failure or an implication that it is Active.
- Draft editing presents accessible Add Item, edit, reorder, and remove controls without hiding Items in accordions. Active and Superseded detail views are read-only even if a stale client displays edit controls.
- Activation and reactivation use an explicit confirmation panel that names phase, category, selected version, the current Active version where relevant, and the future-snapshot-only consequence. Pending state stays in the panel, duplicate submission is blocked, failures remain in context with Retry, and success appears only after authoritative reload.
- Keep phase, category, version, and textual status readable across desktop, tablet, and constrained widths. Controls must be keyboard reachable, focus-visible, and understandable without color alone. Route loading feedback preserves the Library’s phase/category/version orientation rather than leaving an unexplained blank state.

## Cross-Story Dependencies

- Story 1.1 establishes the template/version persistence, privileged read path, URL-driven Library, and status vocabulary that every later story uses.
- Story 1.2 introduces draft allocation, detail navigation, event infrastructure, and the first mutation capability; Story 1.3 depends on that editable draft and its revision model.
- Story 1.4 depends on valid draft definitions from Story 1.3 and establishes the immutable Active/Superseded state transition, locking, and active-pointer rules reused by Story 1.5.
- Story 1.5 reuses activation’s lock and future-snapshot-only semantics to restore a Superseded version without editing it.
- Later operational work depends on this epic’s single Active version per phase/category to select immutable Prep and Return snapshots; that snapshot work is outside this epic.

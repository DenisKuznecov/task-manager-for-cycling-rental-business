# Checklist Contract

## Preparation Definitions

Checklist content is owned and preconfigured by this application. Booqable contributes only the bike product's workshop-type tag.

Launch tags:

- `workshop-road-bike`
- `workshop-e-city-bike`
- `workshop-e-mtb-bike`
- `workshop-gravel-bike`
- `workshop-e-road-bike`

Each launch definition must specify:

- one workshop-type tag mapping;
- an ordered list of stable checklist items;
- each item's label;
- item type: `action` or `tyre_pressure_psi`;
- whether M1 completion is required;
- whether M2 must verify the item;
- whether the item allows an explicit `not_applicable` outcome.

The ordered items for the remaining tags and the shared storage checklist are required before implementation. A shared base list plus explicit differences per tag is sufficient. MVP has no template editor, runtime inheritance, arbitrary field types, or free-text values.

An identified bike always receives a visible task. A missing or unrecognized workshop tag shows a Booqable product-configuration warning; it does not invalidate or hide the task. Block **Start preparation** until the tag is corrected in Booqable and synchronization selects the checklist.

## M1 Interaction

- Present one linear, touch-first checklist with large tappable rows and minimal actions.
- An `action` item is completed by tapping it or, only when configured, explicitly marking it `not_applicable`.
- A `tyre_pressure_psi` item accepts a numeric PSI value.
- Any mechanic may continue existing work; no item or task becomes assigned or locked.
- M1 completion is unavailable until every required M1 item is valid.
- The explicit M1 completion action records the current authenticated user and time as the stage signer.

## M2 Interaction

- Show only items designated for M2 verification.
- M2 independently confirms each designated action item.
- For a designated `tyre_pressure_psi` item, show M1's recorded PSI and require confirmation of that value; do not request a second measurement.
- If M1 marked a designated item `not_applicable`, show that outcome and require M2 to confirm it.
- M2 completion is unavailable until every designated item is verified and the current add-ons are confirmed.
- The explicit M2 completion action records the current authenticated user and time as the stage signer.
- If M1 and M2 signer identities match, require and retain explicit same-mechanic confirmation.

## Add-ons

- Display the order's current add-ons throughout the task.
- Require explicit confirmation that preparation matches the current add-ons before `Ready for Pickup`.
- Synchronize late add-on changes into the display.
- A change after `Ready for Pickup` does not reopen preparation or alter task status in MVP.

## Storage Checklist

Use one shared post-rental checklist for every bike type. Its launch definition must cover:

- damage inspection;
- cleaning;
- removal or swapping of rental-installed parts;
- return of the bike to storage.

The storage stage uses the same `action` and `tyre_pressure_psi` type boundary, although the final launch definition determines which types are present. Every required item gates `Completed`. One authenticated mechanic signs the stage; no M2 re-check follows.

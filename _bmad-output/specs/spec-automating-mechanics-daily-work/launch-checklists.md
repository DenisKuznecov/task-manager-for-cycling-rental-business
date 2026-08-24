# Launch Checklists

## Road Bike

Tag: `workshop-road-bike`

Source: road prep checklist supplied 2026-08-24 (replaces the previous 25-item paper list).

| Order | ID | Item | Type | Required | M2 verifies | N/A allowed |
|---:|---|---|---|---|---|---|
| 1 | `ROAD-01` | Bikefit applied | Action | Yes | No | Yes |
| 2 | `ROAD-02` | Bike cleaned | Action | Yes | No | No |
| 3 | `ROAD-03` | Check frame and components for damage | Action | Yes | No | No |
| 4 | `ROAD-04` | Rewax chain | Action | Yes | No | Yes |
| 5 | `ROAD-05` | Check brake pads wear, pins checked | Action | Yes | No | No |
| 6 | `ROAD-06` | Check rotors wear | Action | Yes | No | No |
| 7 | `ROAD-07` | Adjust brakes | Action | Yes | Yes | No |
| 8 | `ROAD-08` | Adjust gears | Action | Yes | Yes | No |
| 9 | `ROAD-09` | Tighten pedals and cranks | Action | Yes | No | No |
| 10 | `ROAD-10` | Check front tyre wear, pressure PSI | PSI | Yes | Yes | No |
| 11 | `ROAD-11` | Check rear tyre wear, pressure PSI | PSI | Yes | Yes | No |
| 12 | `ROAD-12` | Adjust headset preload | Action | Yes | No | No |
| 13 | `ROAD-13` | Check saddle level | Action | Yes | No | No |
| 14 | `ROAD-14` | Bolt check — stem, handlebar, saddle | Action | Yes | Yes | No |
| 15 | `ROAD-15` | Bag/pump/comp mount | Action | Yes | Yes | No |
| 16 | `ROAD-16` | Charger/lube with a bike | Action | Yes | Yes | Yes |
| 17 | `ROAD-17` | Charge + check shifting batteries | Action | Yes | Yes | No |
| 18 | `ROAD-18` | Check powermeter battery | Action | Yes | No | Yes |
| 19 | `ROAD-19` | Customer name on a bike | Action | Yes | No | No |

For a required item that allows N/A, an explicit N/A selection satisfies M1 only when the equipment or service does not apply. If the item requires M2, M2 must confirm the N/A selection.

The task already supplies the bike ID and order ID. Mechanic 1 and Mechanic 2 paper signature rows become the authenticated M1 and M2 stage attestations, not checklist items.

## E-city Bike

Tag: `workshop-e-city-bike`

Source: e-city prep checklist supplied 2026-08-24.

| Order | ID | Item | Type | Required | M2 verifies | N/A allowed |
|---:|---|---|---|---|---|---|
| 1 | `ECITY-01` | Check bike, bag cleaned | Action | Yes | No | No |
| 2 | `ECITY-02` | Check frame and components for damage | Action | Yes | No | No |
| 3 | `ECITY-03` | Check front brake performance | Action | Yes | Yes | No |
| 4 | `ECITY-04` | Check rear brake performance | Action | Yes | Yes | No |
| 5 | `ECITY-05` | Check rear derailleur shifting | Action | Yes | Yes | No |
| 6 | `ECITY-06` | Torque check: stem and handlebar | Action | Yes | Yes | No |
| 7 | `ECITY-07` | Torque check: seatpost and saddle clamp | Action | Yes | Yes | No |
| 8 | `ECITY-08` | Torque check: front and rear thru-axle | Action | Yes | Yes | No |
| 9 | `ECITY-09` | Check headset for play | Action | Yes | Yes | No |
| 10 | `ECITY-10` | Check front wheel is true | Action | Yes | No | No |
| 11 | `ECITY-11` | Check front tyre for wear, cuts, and cracks | Action | Yes | Yes | No |
| 12 | `ECITY-12` | Check rear wheel is true | Action | Yes | No | No |
| 13 | `ECITY-13` | Check rear tyre for wear, cuts, and cracks | Action | Yes | Yes | No |
| 14 | `ECITY-14` | Set front tyre pressure PSI | PSI | Yes | Yes | No |
| 15 | `ECITY-15` | Set rear tyre pressure PSI | PSI | Yes | Yes | No |
| 16 | `ECITY-16` | Check main battery level (>80%) | Action | Yes | Yes | No |
| 17 | `ECITY-17` | Check saddle bag contents, pump | Action | Yes | Yes | No |
| 18 | `ECITY-18` | Verify charger and lock included | Action | Yes | Yes | No |
| 19 | `ECITY-19` | Verify keys matched and included | Action | Yes | Yes | No |
| 20 | `ECITY-20` | Customer name tag attached | Action | Yes | No | No |
| 21 | `ECITY-21` | Check saddle level | Action | Yes | No | No |
| 22 | `ECITY-22` | Bikefit applied | Action | Yes | No | Yes |

## Shared Prepare for Storage

Used for every bike type in MVP.

| Order | ID | Item | Type | Required | M2 verifies | N/A allowed |
|---:|---|---|---|---|---|---|
| 1 | `STORAGE-01` | Check bike for damage | Action | Yes | No | No |
| 2 | `STORAGE-02` | Check saddle bag contents | Action | Yes | No | Yes |
| 3 | `STORAGE-03` | Check charger | Action | Yes | No | Yes |
| 4 | `STORAGE-04` | Restore customized parts and settings to the bike's default setup | Action | Yes | No | Yes |
| 5 | `STORAGE-05` | Clean the bike | Action | Yes | No | No |
| 6 | `STORAGE-06` | Return the bike to storage | Action | Yes | No | No |

An explicit N/A selection satisfies an allowed item when the bike has no saddle bag, charger, or customized setup to restore. One authenticated mechanic completes and signs the stage; no M2 verification follows.

## Checklists Still Required

- `workshop-e-mtb-bike`
- `workshop-gravel-bike`
- `workshop-e-road-bike`

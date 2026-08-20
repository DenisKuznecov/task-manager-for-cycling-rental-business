# Launch Checklists

## Road Bike

Tag: `workshop-road-bike`

Source: current “ROAD Bike Pre Delivery Inspection” paper checklist supplied on 2026-08-20.

| Order | ID | Item | Type | Required | M2 verifies | N/A allowed |
|---:|---|---|---|---|---|---|
| 1 | `ROAD-01` | Check bike cleaned | Action | Yes | No | No |
| 2 | `ROAD-02` | Check frame and components for damage | Action | Yes | No | No |
| 3 | `ROAD-03` | Check front brake performance | Action | Yes | Yes | No |
| 4 | `ROAD-04` | Check rear brake performance | Action | Yes | Yes | No |
| 5 | `ROAD-05` | Check front derailleur shifting | Action | Yes | Yes | Yes |
| 6 | `ROAD-06` | Check rear derailleur shifting | Action | Yes | Yes | No |
| 7 | `ROAD-07` | Torque check: pedals | Action | Yes | Yes | No |
| 8 | `ROAD-08` | Torque check: stem and handlebar | Action | Yes | Yes | No |
| 9 | `ROAD-09` | Torque check: seatpost and saddle clamp | Action | Yes | Yes | No |
| 10 | `ROAD-10` | Torque check: front and rear thru-axles | Action | Yes | Yes | No |
| 11 | `ROAD-11` | Check headset for play | Action | Yes | Yes | No |
| 12 | `ROAD-12` | Check front wheel is true | Action | Yes | Yes | No |
| 13 | `ROAD-13` | Check front tyre for wear, cuts, and cracks | Action | Yes | Yes | No |
| 14 | `ROAD-14` | Check rear wheel is true | Action | Yes | Yes | No |
| 15 | `ROAD-15` | Check rear tyre for wear, cuts, and cracks | Action | Yes | Yes | No |
| 16 | `ROAD-16` | Set front tyre pressure | PSI | Yes | Yes | No |
| 17 | `ROAD-17` | Set rear tyre pressure | PSI | Yes | Yes | No |
| 18 | `ROAD-18` | Check main battery level is above 80% | Action | Yes | Yes | Yes |
| 19 | `ROAD-19` | Check shifters battery level is above 20% | Action | Yes | Yes | Yes |
| 20 | `ROAD-20` | Check power-meter battery level is above 20% | Action | Yes | Yes | Yes |
| 21 | `ROAD-21` | Check saddle bag contents and pump | Action | Yes | Yes | No |
| 22 | `ROAD-22` | Verify charger and lube are included | Action | Yes | Yes | Yes |
| 23 | `ROAD-23` | Attach customer name tag | Action | Yes | No | No |
| 24 | `ROAD-24` | Check saddle level | Action | Yes | No | No |
| 25 | `ROAD-25` | Apply bikefit | Action | Yes | No | Yes |

For a required item that allows N/A, an explicit N/A selection satisfies M1 only when the equipment or service does not apply. If the item requires M2, M2 must confirm the N/A selection.

The task already supplies the bike ID and order ID. Mechanic 1 and Mechanic 2 paper signature rows become the authenticated M1 and M2 stage attestations, not checklist items.

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

- `workshop-e-city-bike`
- `workshop-e-mtb-bike`
- `workshop-gravel-bike`
- `workshop-e-road-bike`

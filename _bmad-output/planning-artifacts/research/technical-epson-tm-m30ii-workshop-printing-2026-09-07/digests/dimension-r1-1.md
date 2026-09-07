# Dimension 1 — exact TM-m30II hardware and SDK

Accessed: 2026-09-07. Documentation evidence only; no installation test. User-reported Windows/Chrome and existing Wi-Fi connection guide scope but are not hardware evidence.

## Claim ledger

- {claim: "Both interface families listed for TM-m30II include Ethernet and USB A/B; Bluetooth varies by model number.", source: "https://download4.epson.biz/sec_pubs/bs/html/m001274/en/chap02_2.html", publisher: "Epson", pub_date: "unknown; copyright 2020", accessed: "2026-09-07", confidence: "high", class: "primary hardware manual", section: "List of Printer Interfaces"}
- {claim: "Ethernet is 10BASE-T/100BASE-TX; Wi-Fi requires an optional USB wireless LAN unit. Thermal roll widths are 79.5±0.5 or 57.5±0.5 mm, maximum roll diameter 83 mm.", source: "https://download4.epson.biz/sec_pubs/bs/html/m001274/en/chap08_1.html", publisher: "Epson", pub_date: "2020-03-24 upload listed by manual index", accessed: "2026-09-07", confidence: "high", class: "primary hardware manual", section: "Specifications"}
- {claim: "203 dpi; standard printable widths 576 dots/72 mm (80 mm roll) and 420 dots/52.5 mm (58 mm). Standard Font A fits 48/35 characters. Cutter leaves a central attachment. Graphics and QR supported. OT-WL02 requires 02.03A+, OT-WL05 02.03B+; OT-WL06 supports specified 02.02/02.03 branches. Ethernet disables Wi-Fi.", source: "https://download4.epson.biz/sec_pubs/bs/pdf/TM-m30II_trg_en_revG.pdf", publisher: "Epson", pub_date: "2024-07-10 upload", accessed: "2026-09-07", confidence: "high", class: "primary hardware manual", section: "pp. 33, 41, 99, 101, 105"}
- {claim: "ePOS JavaScript SDK 2.27.0h is listed with release date 2026-01-20; history explicitly adds TM-m30II in 2.14.0. Listed supported Chrome range still ends at 125, so it does not establish September 2026 Chrome compatibility.", source: "https://www.epson.jp/dl_soft/readme/45381.htm", publisher: "Epson Japan", pub_date: "2026-01-20", accessed: "2026-09-07", confidence: "high for listing; compatibility unproven", class: "primary SDK release listing", section: "Version, restrictions, release history"}
- {claim: "Epson lists exact-model technical reference M00127606, uploaded 2024-07-10, with automatic certificate update documentation added; manual age is explicit rather than a current firmware assertion.", source: "https://support.epson.net/publist/bsmanual.php?lang=EN&model=TM-m30II", publisher: "Epson", pub_date: "unknown; individual upload dates", accessed: "2026-09-07", confidence: "high", class: "primary manual registry", section: "TM-m30II Technical Reference Guide overview"}

## Interpretation and gaps

The documented print area suits monochrome bike tags and a narrow customer checklist; actual readability, roll width and long-receipt layout need a physical sample. Use a roll-native layout. Exact SKU, firmware branch, regional wireless adapter and enabled services remain unverified. Never transfer TM-m30II-H/III capabilities onto this unit.

Leads: printer self-test/status sheet; firmware-aware certificate route in dimension 2; exact installed paper width and physical cut behavior. Stopping reason: stable hardware evidence acquired; remaining questions require installation evidence, not more general sources. Five distinct primary sources; old manuals accepted for fixed hardware specifications, not current browser compatibility.

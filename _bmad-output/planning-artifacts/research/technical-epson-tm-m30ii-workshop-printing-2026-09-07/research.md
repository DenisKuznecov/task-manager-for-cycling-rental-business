---
title: 'Technical research: Epson TM-m30II workshop printing'
type: technical
topic: 'Epson TM-m30II workshop printing'
decision: 'Determine printer capability and the simplest feasible one-tap network printing integration'
source: native-web-research
status: complete
preset: standard
validation: normal
created: 2026-09-07
updated: 2026-09-07
claims_verified: 4
claims_unverified: 8
physical_pilot: not-run
applicability: 'Historical TM-m30II study; installed printer identified as TM-m30III during spike'
---

# Epson TM-m30II workshop printing

## Installation correction — 7 September 2026

The network sheet supplied during the implementation spike identifies the installed printer as **TM-m30III**, firmware **13.04**, with Ethernet address **192.168.1.38**. This supersedes the model assumption used in this report. Keep the following as historical research; in particular, do not use its TM-m30II firmware thresholds to configure the actual printer. The TM-m30III reference explicitly documents ePOS-Print and Server Direct Print. Current model evidence and live results are recorded in [printer-spike-evidence.md](../../../implementation-artifacts/printer-spike-evidence.md).

## Executive summary

**Recommendation: pilot direct printing from Chrome on the workshop Windows laptops to the existing Wi-Fi TM-m30II, using Epson's ePOS interface.** Epson documents the model's network print protocols and thermal format; they provide a credible basis for both the short M1 tag and the longer M2 checklist. **Medium confidence; installed firmware and output remain unverified.** [1][14]

The connection should originate on the mechanic's laptop, which has access to the workshop network. The cloud app can still serve the page and authoritative task data. Private printer addresses require local or explicitly connected routing; this underlying constraint is **independently verified**. [7][17]

Current Chrome can permit an HTTPS app to access an HTTP private-IP printer after local-network permission, so a direct connection is viable to investigate. That browser mechanism is **independently verified**, but permission alone does not establish the printer's CORS behavior. Epson's retrieved browser compatibility list also stops at Chrome 125. The deployed app, actual Chrome version and actual printer must pass the pilot before we adopt this transport. [2][3][5][16]

If direct printing fails the pilot, **QZ Tray on the Windows laptops is the fallback**. Client installation and trust prompts are independently corroborated; silent-print signing requirements remain vendor-documented, medium/unverified. Initial setup is necessary for either path; one tap is the target for ordinary printing afterward. [8][9][18]

This report completes documentation research, not a hardware test or implementation. The proposed [pilot checklist](pilot-checklist.md) turns the remaining installation questions into concrete acceptance checks.

## Printer capabilities and paper layout

**Documented, medium confidence; installation unverified.** Epson's exact TM-m30II reference lists ePOS-Print XML, ePOS-Device XML and ESC/POS. It specifies 203 dpi thermal printing, an 80 mm roll with a 72 mm/576-dot standard print area, or a 58 mm roll with a 52.5 mm/420-dot area. Standard Font A fits 48 or 35 characters respectively. The cutter leaves a small central attachment. Wireless LAN uses a supported optional adapter; the user's existing Wi-Fi setup still needs its firmware/adapter details recorded. The manual registry dates this reference's upload to July 2024. [1][12]

**Design implication:** use a roll-native layout. An 80 mm roll is the preferred pilot format if already installed: a short M1 tag, followed by a longer M2 receipt containing the full checklist. This is a layout recommendation, not a measured readability result. Use wrapped checklist text and compact, visibly separate M1/M2 marks. Physically test long bike names, staff-name accents, check marks and the optional logo; do not assume any arbitrary Unicode glyph prints correctly.

The same printer can therefore be investigated for both product artifacts without adding an A4 requirement. Printed paper does not establish that the underlying task passed its checklist; the app must supply the verified task data required by the source brief.

## Connection from Windows Chrome

**Proposed flow:** the cloud app serves authenticated task data to the laptop; browser-side printing code sends the print job over the workshop network to the printer. Being connected through Wi-Fi does not by itself prove laptop-to-printer reachability—test the actual networks and router configuration.

```text
Cloud app  ── authenticated task data ──>  Windows laptop / Chrome
                                               │
                                      local network print request
                                               │
                                               ▼
                                      TM-m30II on workshop Wi-Fi
```

A public-cloud server cannot reach a workshop private IP merely because the user's laptop can. RFC 1918 addresses are local to their private routing domains. A server-side print request requires an explicit network path, or a local process that receives jobs and prints them. **Underlying routing constraint independently verified; application to this architecture is an inference.** [7][17]

Epson's ePOS-Print protocol reference documents SOAP/XML over HTTP, including this receipt-print endpoint shape. It is a protocol starting point, not a tested URL for this installation. **Medium confidence, unverified; historical protocol documentation.** [6]

```text
http://<printer-address>/cgi-bin/epos/service.cgi?devid=<device-id>&timeout=<milliseconds>
```

**Chrome is the decisive compatibility check.** Google and MDN describe an exception allowing an HTTPS website to send an HTTP request to a local IP literal or `.local` destination after Local Network Access permission. **Mechanism independently verified; not a printer compatibility test.** [3][16]

Google dates initial LNA rollout to Chrome 142; its rolling enterprise notes describe separate local-network and loopback permissions in 145 and WebSocket/WebTransport coverage in 147. **Version milestones remain single-publisher, medium/unverified.** Record the installed version and policies; these can change setup behavior. Older advice that all HTTPS-to-HTTP printer requests are necessarily blocked is insufficient for this target. [3][4]

Permission is only one condition. Cross-origin access must also satisfy CORS; XML content types are outside the ordinary safelisted request types. A direct XML POST may therefore encounter a preflight. Verify the actual printer response and the chosen Epson SDK transport before committing to a hand-written request. **Medium confidence, unverified independently.** [5]

The SDK distribution page lists version 2.27.0h dated 2026-01-20 and TM-m30II support in its history, but its Chrome support range ends at 125. That is a compatibility evidence gap, not proof that current Chrome fails. A newer 2.27.0i package dated July 2026 appears in another Epson model's download listing; do not treat January's package as the latest or that other model's listing as installation certification. **Medium confidence, current installation unverified.** [2][15]

The exact-model manual documents an automatic CA certificate route requiring firmware 02.20A/B or later and JavaScript SDK 2.24.0b or later, plus setup conditions including internet connectivity and correct time. The installed firmware is unknown; treat HTTPS provisioning as a setup branch to verify, not a capability already enabled on this unit. **Medium confidence, unverified.** [1]

The exact-model Windows Utility manual also documents manual certificate selection and HTTPS settings. It does not establish a complete current Windows/Chrome trust procedure for a self-signed certificate. Likewise, ePOS-Print HTTP and ePOS-Device socket communication are distinct routes; the receipt URL above should not be combined with guessed SDK socket ports. **Medium confidence, unverified; these boundaries come from Epson's utility and developer documentation.** [13][14]

## Options and operating burden

This comparison uses the source brief's one-tap requirement and confirmed Windows/Chrome setup. It is a feasibility comparison, not a weighted vendor selection. Recommendations are design judgments; product capabilities retain the confidence of their cited sources.

| Option | Path to the printer | Setup and limitation | Position |
|---|---|---|---|
| Direct Epson browser printing | Chrome → printer over the shop LAN | Verify ePOS service, network address, current Chrome permission, CORS and HTTP/HTTPS behavior. Epson's compatibility list does not certify current Chrome. [1][2][3][5][6] | First pilot; least additional software if it passes. |
| QZ Tray on each Windows laptop | Chrome → local QZ process → printer | Install and maintain QZ; provision trusted signing for silent printing and test loopback permissions. Client installation is independently corroborated; raw printing/signing details are vendor-documented. [4][8][9][18] | Fallback if direct transport proves awkward or unreliable. |
| Custom local print agent pulling cloud jobs | Browser → cloud job service; local agent receives jobs → printer | Requires an available shop machine, job lifecycle, authorization, retry rules and operations. This is a proposed architecture, not an existing integration. [7] | Consider if printing must work without the initiating laptop reaching the LAN. |
| Printer-native Server Direct Print | Printer polls cloud server | A regional listing advertises this and the model registry links a manual, but the support-matrix download failed. Exact installed-SKU support/configuration remain unresolved. [11][12] | Do not commit until exact-model technical evidence and configuration are verified. |

QZ's signing documentation recommends server-side signing and describes an initial trust decision. **The exact signing contract is medium/unverified.** Pricing and licensing were not researched, so the fallback is not represented as cost-free. [9]

## Failure handling and reprinting

Epson responses expose `success`, `code` and `status`, with error information for conditions including paper and cover problems. Its protocol manual says already-interpreted data can print after a timeout, and response timing differs with spooler configuration. Successful processing must not be described as an unconditional physical-print guarantee. **Medium confidence, unverified; historical protocol contract.** [6]

The promise returned by QZ's print API resolves when the document has been sent to the printer. **That exact API contract is medium/unverified.** Microsoft independently documents Windows spooler states that can precede physical printing, corroborating the general delivery-versus-output distinction; it does not verify Epson-specific response semantics. [10][19]

**Recommended application behavior:** show a print-in-progress state and prevent duplicate clicks while that attempt is pending. Surface known failures clearly. A timeout after submission can leave the outcome unknown; ask the mechanic to check the paper before an explicit reprint, rather than automatically assuming nothing printed. A job identifier supports correlation but does not establish printer-side deduplication. These are design proposals derived from the delivery contracts, not tested printer behavior. [6][10]

Keep checklist progression independent of print outcome, as the source brief requires. Preserve the M1/M2 gating and reprint availability. The existing app should provide the authoritative task data; the print transport should not decide whether a bike is ready. No database or application implementation is part of this report.

## Cross-dimension findings

The confirmed Windows laptops make a local-software fallback practical, but changing transport shifts setup from printer-side ePOS/CORS to bridge installation, signing and Chrome loopback permissions. The app's gated data and paper layout should therefore remain independent of the chosen transport. **Design inference from the compared interfaces, not a measured deployment result.** [4][5][8][9]

## Recommendations and handoff

1. **Architecture input:** prototype direct browser-to-printer ePOS on one workshop Windows laptop and the deployed app origin, using the existing Wi-Fi printer. Keep a transport boundary so a Windows bridge can replace the connection without redesigning the checklist artifacts. This recommendation rests on documented capabilities with a current-browser validation gap. [1][2][3][6]
2. **Setup input:** record exact model, firmware, paper width, address, Chrome version and permission/policy state. Establish a stable printer address with the network administrator. Test HTTP/LNA and the documented HTTPS provisioning branch as applicable; avoid choosing a protocol solely from a generic receipt-printer tutorial.
3. **Product/spec input:** preserve the two-stage gating and one-tap normal workflow from the source brief. Define what print success means, and distinguish known failure from unknown delivery outcome. Use an explicit reprint for ambiguous outcomes. [6][10]
4. **Implementation acceptance:** execute [pilot-checklist.md](pilot-checklist.md), including both paper artifacts, second-laptop setup, restarts, double-clicks, concurrent jobs, paper-out and Wi-Fi loss. The pilot is proposed and has not run.

## Open questions

| Question | Evidence needed to close it |
|---|---|
| Exact SKU, firmware, adapter and paper width? | Printer configuration/status output and physical inspection. |
| Can the workshop laptops reach this printer reliably? | Test from the actual network, including address stability and guest/client isolation. |
| Does the chosen ePOS request work from the deployed HTTPS app on installed Chrome? | Browser network trace, permission behavior, CORS/preflight response and one real receipt. |
| Is HTTPS supported and provisioned on this firmware? | Follow exact-model setup instructions and verify certificate trust and renewal behavior. |
| Does native Server Direct Print apply to this SKU? | Exact-model documentation or Epson confirmation plus available printer settings. |
| Which response establishes the desired completion state? | SDK/firmware contract and failure tests, including lost acknowledgement after physical printing. |
| Are the full checklist and marks legible? | Real longest-task output on the installed roll. |

## Source appendix

Access date for every source: 2026-09-07. Unknown publication dates are intentional. Multiple Epson pages count as one publisher, not independent verification. Under this run's strict confidence rules, single-publisher documentation is medium/unverified even when authoritative.

| Ref | Supports | Publisher and source | Publication / upload date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | Exact-model protocols, paper, print area, wireless and certificate prerequisites | [Epson — TM-m30II Technical Reference Guide, Rev. G](https://download4.epson.biz/sec_pubs/bs/pdf/TM-m30II_trg_en_revG.pdf) | Upload 2024-07-10 | 2026-09-07 | Medium; unverified |
| [2] | SDK availability, model history and Chrome support range | [Epson Japan — ePOS JavaScript SDK release listing](https://www.epson.jp/dl_soft/readme/45381.htm) | 2026-01-20 | 2026-09-07 | Medium; unverified |
| [3] | LNA permission and local HTTP mixed-content exception | [Google Chrome — Local Network Access](https://developer.chrome.com/blog/local-network-access) | 2025-06-09; updated 2025-09-29 | 2026-09-07 | Mechanism verified with MDN; rollout dates medium |
| [4] | Subsequent local/loopback and WebSocket changes | [Google — Chrome Enterprise release notes](https://support.google.com/chrome/a/answer/10314655?hl=en) | Unknown; rolling notes | 2026-09-07 | Medium; unverified |
| [5] | CORS and non-safelisted XML request types | [MDN — Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) | Updated 2026-09-04 | 2026-09-07 | Medium; unverified |
| [6] | Receipt XML endpoint and response semantics | [Epson — ePOS-Print XML User's Manual, Rev. S](https://files.support.epson.com/pdf/pos/bulk/epos-print_xml_um_en_revs.pdf) | Unknown; historical manual | 2026-09-07 | Medium; unverified |
| [7] | Private network addressing and routing inference | [IETF/RFC Editor — RFC 1918](https://www.rfc-editor.org/rfc/rfc1918.html) | 1996-02 | 2026-09-07 | Routing constraint verified with AWS |
| [8] | Local bridge raw network printer support | [QZ Industries — Raw printing](https://qz.io/docs/raw) | Unknown | 2026-09-07 | Medium; unverified |
| [9] | Silent printing, request signing and trust setup | [QZ Industries — Message signing](https://qz.io/docs/signing) | Unknown | 2026-09-07 | Medium; unverified |
| [10] | QZ print promise completion boundary | [QZ Industries — API reference](https://qz.io/api/qz) | Unknown | 2026-09-07 | Medium; unverified |
| [11] | Regional Server Direct Print claim requiring exact-SKU confirmation | [Epson Malta — TM-m30II (112) listing](https://www.epson.com.mt/mt_MT/products/printers/pos-printers/pos-printers/mpos-%26-tablet-pos-printers/epson-tm-m30ii-%28112%29%3A-usb-%2B-ethernet-%2B-nes-%2B-bt%2C-black%2C-ps%2C-eu/p/30290) | Unknown | 2026-09-07 | Low; installation unverified |
| [12] | Exact-model manual identity and upload date | [Epson — TM-m30II manual registry](https://support.epson.net/publist/bsmanual.php?lang=EN&model=TM-m30II) | Unknown; dated entries | 2026-09-07 | Medium; unverified |
| [13] | Exact-model manual TLS/certificate configuration | [Epson Japan — TM-m30II Utility manual](https://www2.epson.jp/dl_soft/file/40075/TM-m30II_Utility_jpn.pdf) | Unknown | 2026-09-07 | Medium; unverified |
| [14] | ePOS HTTP/socket distinction and LAN support | [Epson Japan — XML developer overview](https://www.epson.jp/products/receiptprinter/develop/xml.htm) | Unknown | 2026-09-07 | Medium; unverified |
| [15] | Newer SDK package availability, not exact-unit certification | [Epson — TM-T20III download listing](https://support.epson.net/setupnavi/?LG2=FR&MKN=TM-T20III&OSC=WS&PINF=swlist) | Package date 2026-07-01 | 2026-09-07 | Medium; unverified |
| [16] | Independent local HTTP permission/exception corroboration | [MDN — Local network access](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access) | Updated 2026-08-12 | 2026-09-07 | Mechanism verified with Google |
| [17] | Independent private-address connectivity corroboration | [AWS — VPC IP addressing](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html) | Unknown; rolling documentation | 2026-09-07 | Routing constraint verified with RFC1918 |
| [18] | Independent QZ client-installation and trust-prompt integration | [Frappe/ERPNext — Raw printing](https://docs.frappe.io/erpnext/raw-printing) | Exact date unknown | 2026-09-07 | Installation/trust pattern verified; signing not independently checked |
| [19] | Windows spooler status can precede physical output | [Microsoft — JOB_INFO_2](https://learn.microsoft.com/en-us/windows/win32/printdocs/job-info-2) | Updated 2021-01-07 | 2026-09-07 | General delivery distinction verified with QZ; historical API contract |

## Staleness map

Calculated from the claim ledger with `recon_kit.py staleness`; see [claims-staleness.json](claims-staleness.json), [claims-undated.json](claims-undated.json) and [staleness-result.json](staleness-result.json). Compatibility uses the technical pack's one-month window; patterns use 24 months. Unknown dates were excluded from the date calculator rather than replaced with the access date.

| Claim / source | Computed re-check date | Meaning for this decision |
|---|---|---|
| Epson January SDK compatibility snapshot [2] | 2026-02-20 — already due | Re-check the model's download/support information during the pilot. |
| Local HTTP/LNA mechanism, latest corroboration [16] | 2026-09-12 | Earliest upcoming dated re-check; verify installed Chrome behavior before implementation. |
| CORS reference [5] | 2026-10-04 | Reference refreshed recently; actual printer headers remain a local test. |
| Newer SDK listing for another model [15] | 2026-08-01 — already due | Availability lead only; confirm the exact model's package before using it. |
| RFC1918 routing basis [7] | 1998-02-01 — historical | Oldest computed date; stable networking standard also checked against live AWS docs. Age is not evidence the rule is obsolete. |
| General delivery-versus-output distinction [19] | 2023-01-07 — historical | Stable Windows contract also checked against current QZ docs; validate selected transport semantics in the pilot. |

The calculator reports four dated claims outside their generic freshness windows. Hardware has no automatic window in this pack; validate the installed paper, firmware and certificate options during setup. Undated rolling browser notes, XML protocol details, QZ setup/signing and native Server Direct Print cannot get honest calendar dates: re-check them at implementation. Use Deep Recon Refresh for source/version updates or Deepen for the unresolved exact-SKU Server Direct Print question.

The ledger tally is **4 independently verified bounded claims and 8 unverified claims**. Unverified includes useful single-publisher documentation, not just unsupported speculation. No independent verification in this report substitutes for the physical pilot.

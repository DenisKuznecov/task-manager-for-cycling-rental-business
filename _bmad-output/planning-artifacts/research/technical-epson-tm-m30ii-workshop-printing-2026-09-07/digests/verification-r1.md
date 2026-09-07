# Independent verification — round 1

Accessed 2026-09-07. Fresh verification using only dimension-r1-1.md, dimension-r1-2.md and dimension-r1-3.md as claim leads. No project context, implementation, memory, or installation evidence used. Six web calls. Six new corroboration sources explored, with previously cited vendor/reference pages reopened. Different pages from one publisher do not count as independent agreement. “Verified” below concerns the bounded underlying claim, never the installed device.

## Verdict ledger

| Claim | Verdict | Evidence and limit |
| --- | --- | --- |
| Exact TM-m30II supports network ePOS | Medium; promising independent corroboration, landing verification incomplete | Epson exact-model manual evidence is in dimension-r1-2. Odoo's own integration documentation explicitly lists TM-m30 i/ii/iii over Wi-Fi/Ethernet as tested direct ePOS printers. Its detailed search extract was retrieved, but two page-open attempts failed. Treat this as an independently published corroborating lead, not a successful landing verification. No installed SKU, firmware, enabled-service or adapter claim follows. |
| A secure Chrome site may fetch an HTTP private IP literal after LNA permission, with mixed-content exemption | Independently verified at mechanism level | Google browser engineering documentation and MDN separately describe this exemption. MDN updated 2026-08-12. Permission must be granted; private IP literals and .local names do not require an extra target-address hint. This does not guarantee that a particular ePOS request succeeds. |
| LNA replaced the proposed PNA preflight mechanism | Medium, Google primary evidence | Reopened Chrome article explicitly says this. Do not rewrite it as removal of ordinary CORS checks. Chrome 142 launch is dated by Google, not independently dated by MDN. Installed Windows Chrome version and enterprise policy remain unknown. |
| CORS remains a separate requirement for XML fetch/XHR | Medium; reconfirmed primary reference, no completed independent corroboration | Reopened MDN CORS documentation has a cross-origin text/xml POST and OPTIONS exchange. XML body syntax alone is not the trigger; Content-Type and other request properties matter. WHATWG Fetch Standard opened, but relevant specification text was not exposed within the remaining call budget, so it is a lead only. Exact printer CORS headers and preflight behavior remain untested. |
| A public cloud process cannot directly reach a shop's RFC1918 printer without a connecting route/network mechanism | Independently verified underlying routing constraint | RFC1918 in dimension-r1-3 plus AWS VPC documentation explaining that private addresses are not Internet reachable. The printer conclusion is a direct architectural inference. VPN, tunnel, proxy, or outbound local agent can change connectivity; “cloud printing is impossible” would be a semantic overstatement. |
| QZ is a Windows-capable local bridge that adds trust setup | Independently verified local installation and permission aspect | QZ docs plus ERPNext's own integration instructions require installing QZ on the client and allowing the connection prompt. This confirms an actual third-party integration pattern. |
| Silent, one-tap QZ printing requires trusted certificate/message signing provision | Medium, vendor documented | Reopened QZ signing instructions require signed calls and describe Allow/Remember. ERPNext corroborates the ordinary prompt, but does not independently document signing or demonstrate suppression. Do not elevate the precise signing contract merely because another publisher documents QZ installation. “One tap” applies after installation, mapping, trust and required browser permissions. |
| Delivery acknowledgement is not an unconditional physical-output guarantee | Independently verified general printing distinction | QZ's sent-to-printer API contract and Microsoft's Windows spooler contract agree at the underlying delivery/completion distinction. Microsoft documents COMPLETE before physical printing and PRINTED being set on submission when TrueEndOfJob is unsupported. This does not prove exact Epson firmware success-code semantics; retain vendor-specific ePOS details at medium. |

## New source records

- source: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access
  - publisher: MDN / Mozilla contributors
  - pub_date: unknown first publication; last modified 2026-08-12
  - accessed: 2026-09-07
  - class: browser-platform reference published independently of Google
  - evidence: secure-context permission and HTTP local-address mixed-content exception, sections “Local network access permissions” and “Relaxing mixed content,” retrieved lines 226–268.
  - caution: do not copy the page's permission-query snippets verbatim; verification here concerns prose describing private IP literals, not a tested implementation. No current-browser certification inferred.

- source: https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/configuration/epos_printers.html
  - publisher: Odoo
  - pub_date: unknown; version 19 documentation, search index crawled three days before access
  - accessed: 2026-09-07
  - class: primary product-integration documentation; detailed search extract only, landing fetch failed twice
  - evidence: “Directly supported ePOS printers” names TM-m30 i/ii/iii with Wi-Fi/Ethernet; configuration uses printer IP and LNA or certificates. Supports exact generation as a lead without extrapolating from m30III alone.
  - gap: successful landing retrieval and test configuration details absent. Do not claim Odoo tested the user's firmware or every regional SKU.

- source: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
  - publisher: Amazon Web Services
  - pub_date: unknown; rolling documentation
  - accessed: 2026-09-07
  - class: primary cloud-networking documentation
  - evidence: “Private IPv4 addresses,” lines 42–49; private addresses are not Internet reachable and VPC routing needs configured connectivity. Independent operational agreement with RFC1918's address-scope constraint.

- source: https://docs.frappe.io/erpnext/raw-printing
  - publisher: Frappe / ERPNext
  - pub_date: exact date unknown; page says last updated six months ago
  - accessed: 2026-09-07
  - class: primary third-party QZ integration documentation
  - evidence: sections 1.1 and 2.1, retrieved lines 2147–2190; client installation, Windows support, connection prompt and locally stored printer mapping. Section 2.2 describes success as print sent.
  - gap: no independent signing/silent-printing instructions on this page. Its Java-installation wording is not verified as current QZ packaging advice.

- source: https://learn.microsoft.com/en-us/windows/win32/printdocs/job-info-2
  - publisher: Microsoft
  - pub_date: updated 2021-01-07
  - accessed: 2026-09-07
  - class: primary stable Windows printing API contract
  - evidence: JOB_STATUS_COMPLETE, line 157, and TrueEndOfJob caveat, line 218. Contract age is acceptable for the delivery-versus-physical-output distinction, not a current Epson driver compatibility claim.

- source: https://fetch.spec.whatwg.org/#cors-safelisted-request-header
  - publisher: WHATWG
  - pub_date: unknown; living standard
  - accessed: 2026-09-07
  - class: primary normative standard; follow-up lead only
  - evidence: landing fetched; relevant safelist text not inspected within budget. No claim upgraded from this source.

## Reopened existing sources

- https://developer.chrome.com/blog/local-network-access — Google Chrome; published 2025-06-09, updated 2025-09-29; accessed 2026-09-07; primary browser engineering documentation. Explicit replacement of PNA and permission-gated HTTP exception. This article describes the first milestone; later transport coverage must come from newer evidence.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS — MDN; first publication unknown, last modified 2026-09-04; accessed 2026-09-07; primary platform reference. XML POST example and request/response headers inspected. Same publisher already present in dimension-r1-2, so not independently verified by reopening.
- https://qz.io/docs/signing — QZ Industries; publication unknown, current compatibility labels 2.0–2.2; accessed 2026-09-07; primary vendor integration contract. Signed calls, trusted certificate, initial Allow/Remember, server-side signing preference. Same publisher pages and mirrors are not independent confirmation.
- https://qz.io/api/qz — QZ Industries; publication unknown; accessed 2026-09-07; primary API documentation. Print resolves at document submission to printer. Windows spooler evidence independently corroborates the general delivery limitation, not this exact API implementation.

## Semantic mismatches and remaining gaps

No evidence supports blanket HTTPS-to-local-HTTP impossibility on current Chrome. LNA permission does not imply CORS success, printer availability, complete physical output, or zero initial setup. An HTTP health check proves less than the real cross-origin XML print path. Test that path from the actual secure app origin with current Windows Chrome, granted permission, expected headers and installed printer firmware.

Keep three distinctions explicit: protocol supported by model versus service enabled on unit; independent documentation corroboration versus local compatibility test; job acknowledged versus paper completely printed. QZ and ePOS acknowledgements cannot be collapsed into one universally defined “confirmed” status. If a UI state uses that word, its transport-specific meaning needs definition.

Exact firmware thresholds, paper dimensions, current SDK compatibility matrix, network ports, ePOS preflight support, deduplication, and Server Direct Print remain outside independent verification here. No claim was inferred solely from prior knowledge. Stop reason: call budget reached; major architecture/browser distinctions corroborated, remaining physical compatibility questions need installation evidence.

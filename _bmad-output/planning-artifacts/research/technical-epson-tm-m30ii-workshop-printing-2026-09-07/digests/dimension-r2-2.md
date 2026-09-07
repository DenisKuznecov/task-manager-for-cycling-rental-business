# Dimension 2 — follow-up delta and boundaries

Accessed: 2026-09-07. No live installation evidence. Single-source confidence medium.

- {claim: "TM-m30II Utility provides SSL/TLS server-certificate selection, TLS version/cipher settings, forced HTTPS and HTTP-to-HTTPS redirection. Certificates must be registered first. This supports manual certificate provisioning, without proving a specific Windows trust procedure.", source: "https://www2.epson.jp/dl_soft/file/40075/TM-m30II_Utility_jpn.pdf", publisher: "Epson Japan", pub_date: "unknown", accessed: "2026-09-07", confidence: "medium", class: "primary exact-model utility manual", section: "p.75 SSL/TLS; points to p.71 Certificates"}
- {claim: "Legacy XML guidance requires certificate/host-name matching for HTTPS. Its blanket prohibition on HTTPS-site-to-HTTP-printer requests predates current Chrome LNA exceptions.", source: "https://files.support.epson.com/pdf/pos/bulk/epos-print_xml_um_en_revs.pdf", publisher: "Epson", pub_date: "unknown; historical Rev.S", accessed: "2026-09-07", confidence: "medium", class: "primary historical protocol manual", section: "p.15 HTTPS"}
- {claim: "Epson's POS security guide identifies ePOS-Device TLS TCP ports 8143/8043 and discusses self-signed certificates. It is a cross-product guide, not exact TM-m30II SDK connect documentation.", source: "https://kb.epson.eu/webfiles/security/Security_Guidebook_v3_POS.pdf", publisher: "Epson Europe", pub_date: "unknown", accessed: "2026-09-07", confidence: "medium for general documentation; exact unit unverified", class: "primary general security guide", section: "p.18 communication protection; p.24 SSL/TLS"}
- {claim: "Epson describes ePOS-Print XML as HTTP and ePOS-Device XML as socket communication, and recommends its JavaScript SDK for browser development. TM-m30-series XML support is limited to wired/wireless LAN in this overview.", source: "https://www.epson.jp/products/receiptprinter/develop/xml.htm", publisher: "Epson Japan", pub_date: "unknown", accessed: "2026-09-07", confidence: "medium", class: "primary developer overview", section: "XML direct transmission"}

## Unresolved gaps and usable boundaries

Exact SDK 8008/8043 semantics and connect options were not retrieved from a usable primary reference. Do not interchange ePOS-Print SOAP HTTP endpoint with ePOS-Device socket ports, and do not prescribe a port based on third-party snippets. Primary source available for a prototype: receipt SOAP POST path in round 1, with local_printer sample in Rev.S p.50.

CORS: no primary receipt-ePOS evidence for specific Access-Control-Allow-* header values was found. Fiscal printer fpmate.cgi documents wildcard origin, but that is a different product/protocol and is inadmissible evidence for this unit. Verify actual OPTIONS/POST responses from the cloud app origin.

Self-signed alternative: primary exact-model utility evidence confirms manual certificate registration/selection; a complete modern Chrome/Windows self-signed trust procedure remains unverified. The exact hardware technical guide had no self-signed text match. Do not promise that simply accepting a browser warning establishes durable XHR/SDK trust. Third-party product guides claim such flows but disagree on certificate validity/trust behavior; they were leads only and not relied on as primary technical evidence.

Automatic CA renewal prerequisites from round 1 remain the strongest exact-model documented HTTPS route; capture firmware branch, serial number, printer time, Internet access, certificate-update setting and schedule before recommending it.

Stop: five-call follow-up budget exhausted, diminishing returns due source retrieval failures. Windows Chrome LNA evidence is current vendor documentation; actual printer CORS, service configuration and certificate chain now need a local test. Six total files are the handoff; no implementation attempted.

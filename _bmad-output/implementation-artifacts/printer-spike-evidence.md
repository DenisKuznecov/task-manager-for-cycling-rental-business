# Direct Epson printer spike — evidence

## Physical target, corrected by user evidence

User-provided network sheet on 2026-09-07 identifies **TM-m30III**, firmware **13.04 ESC/POS**, network firmware 08.54, Ethernet address **192.168.1.38**, subnet 255.255.255.0, gateway 192.168.1.1. This supersedes the earlier TM-m30II assumption. The original research remains historical; its model-specific firmware guidance does not establish this printer's setup.

Fresh primary evidence: [Epson TM-m30III Technical Reference Guide Rev.F](https://download4.epson.biz/sec_pubs/bs/pdf/TM-m30III_trg_en_revF.pdf), pp94/134, accessed 2026-09-07, confirms ePOS-Print XML and HTTP/HTTPS. Page92 also explicitly documents Server Direct Print for this model, resolving the earlier model-dependent research uncertainty; that alternative is outside this direct-browser spike.

## Initial live checks

- Route to 192.168.1.38 uses this Mac's en0 interface.
- HTTP HEAD to printer root succeeds with 301 to https://192.168.1.38/. Server responds with lighttpd and allows POST/GET/OPTIONS/HEADER plus XML/SOAP-related headers. Root response alone does not establish ePOS endpoint CORS or printing.
- Initial sandbox probe was blocked; the approved network probe succeeded. Do not classify the sandbox failure as printer offline.
- Locked npm dependencies installed successfully. Existing dependency audit warnings were not addressed as part of the spike.

Implementation, browser tests and physical output results will be appended as observed. Do not overwrite live evidence or claim unexecuted tests passed.

## Live browser attempt and failure — 7 September 2026

- Authenticated mechanic session on local Chrome 152/macOS, origin `http://localhost:3002`. This is not verification of Windows Chrome or the deployed HTTPS origin.
- The ePOS endpoint on HTTP responds directly (unlike the root redirect). Its OPTIONS response permits the local browser request, including the XML/SOAP headers. The browser read the Epson response successfully.
- Empty ePOS status request returned HTTP 200, `success="true"`, empty code and status `251658262`. This verifies a status exchange, not a physical print.
- One fixed diagnostic receipt request returned after 10,595 ms: HTTP 200, `success="false"`, `code="EX_TIMEOUT"`, `status="1"`. User explicitly reports that no paper printed. No automatic retry was sent.
- [Epson ePOS-Print XML manual Rev.S](https://files.support.epson.com/pdf/pos/bulk/epos-print_xml_um_en_revs.pdf), pp68–69, defines EX_TIMEOUT as print timeout and status bit 1 as no response from the TM printer. Transport reachability succeeded; print completion did not. Treat delivery as uncertain, not safe to retry automatically.
- Subsequent read-only Web Config Product Status says `Available.` Network Status confirms Wi-Fi at 72 Mbps, Excellent signal, manually assigned `192.168.1.38`. The sheet's Ethernet heading does not mean this installation is wired. No printer configuration was changed; TLS certificate validation was bypassed only for the read-only local curl inspection, not in the application.

### Firmware lead, not a confirmed diagnosis

[Epson TM-m30III firmware updater 13.19 release notes](https://download-center.epson.com/f/module/7cc10f2a-1cb4-40e8-bf38-89b0bff67eee/overview/ov_TM-m30III_Series_Firmware_Updater_Ver.13.19_e.pdf), p6, records a fix in 13.09 for ePOS printing sometimes failing from power-saving mode. Installed 13.04 predates that fix. This is a plausible cause to test after checking physical Feed/error-light behavior, not proof that this failure is that bug.

Do not update firmware as an implicit spike step. The same release notes warn of downgrade restrictions and that the updater enables automatic Epson cloud connection/serial-number upload. Any firmware change needs a separately agreed maintenance action and settings review.

### Controlled test after Feed — physical output confirmed

The user confirmed that a short Feed press advanced paper. The parent then sent exactly one further receipt from the same authenticated local browser page and target. It returned HTTP 200, `success="true"`, empty code, status `251658262`, elapsed **1,347 ms**. Asked whether the labelled receipt came out and cut, the user answered **“yes!”**.

This establishes physical direct-browser Wi-Fi printing and cutting from this local Mac/Chrome setup. It does not establish cold/idle reliability, the firmware root cause, or deployed HTTPS/Windows Chrome compatibility. The before/after Feed result strengthens the power-saving hypothesis but is not a controlled reproduction. Total live receipt requests: two (one timed out with no output reported, one confirmed printed/cut). No automatic retries and no printer configuration changes.

## Commit checkpoint verification

At the user's requested commit/handover: `npm run test:printer-spike` passed 12/12; `npm run test:workshop-ui` passed 38/38; `npx tsc --noEmit` passed. Targeted ESLint reported no errors, with a warning that the native `.mts` test is ignored by existing configuration. Production build and remaining browser/review checks have not been completed. The `EX_TIMEOUT` classification correction is still pending in code (current generic negative reply maps to `failed`, with no automatic retry). See [handover](printer-spike-handover.md) for exact remaining work.

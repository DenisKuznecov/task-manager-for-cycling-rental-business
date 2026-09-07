# Workshop printer pilot

Status: proposed acceptance checks; none executed on the physical printer. This is an implementation handoff, not evidence that the installation works.

## Record the installation

- Record exact printer model/SKU, firmware, configured paper width, and network address from the printer's configuration/status output.
- Record Windows and Chrome versions and whether the browser profile is managed.
- Confirm the laptop can reach the printer from the actual workshop Wi-Fi. Record any guest-network/client-isolation constraint.
- Identify who can reserve the printer address in the router and administer the printer. Do not assume an address remains stable merely because it works today.
- Identify the deployed app origin used for the pilot. Test that origin, rather than relying only on localhost development behavior.

## Prove the selected transport

- Follow the final research recommendation for the first candidate. Record endpoint, protocol, certificate requirements, and all initial browser/OS setup steps.
- Send one deliberately small test job. Confirm physical output, readable content, status response, and cutting behavior.
- Repeat after Chrome restarts, the laptop restarts, and the printer restarts. Confirm ordinary print actions require one click with no recurring dialog.
- Repeat from a second mechanic's Windows laptop/browser profile. Record any per-laptop setup.
- Test denied local-network permission where the chosen transport uses it; verify the user sees an actionable failure and can recover through normal settings.

## Prove both artifacts

- M1: prominent `1`, order number, bike name, stock ID. Check long names and wrapping at the real paper width.
- M2: full checklist, distinct M1 and applicable M2 marks, both staff names, preparation timestamp. Check accented names and the actual chosen check-mark rendering.
- Print the longest realistic task. All content must be present and legible with a complete final line and cut.
- Include a logo only after a physical monochrome sample shows it is clear and does not compete with the checklist.

## Prove failure and retry behavior

- Printer offline; paper exhausted before submission; cover open; Wi-Fi lost during submission.
- Network timeout after the job may already have reached the printer. App must distinguish a known failure from an unknown outcome; an explicit reprint may duplicate an already printed copy.
- Rapid double-click and overlapping jobs from two laptops. Check whether output remains complete and separate and whether the app avoids accidental duplicate submissions.
- A failed or unknown print result remains visible but does not prevent task progression once the relevant checklist is complete.
- Reprints use the intended verified task data and remain available at the stages required by the source brief.
- If a local service or cloud queue is selected, restart it and check for stale jobs or unintended replay. Record whether completion means queued, sent, printer-acknowledged, or physically observed.

## Exit decision

Adopt the direct candidate only when printing from the deployed app origin passes all applicable checks on both workshop laptops without recurring mechanic-facing setup. If it fails, record the exact browser/network/printer error before moving to the documented fallback. A transport pilot passing does not itself implement the task-state gating or production print UI.

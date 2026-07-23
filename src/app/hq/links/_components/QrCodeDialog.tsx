"use client";

import React from "react";
import QRCode from "react-qr-code";
import { FeatherDownload } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import type { MarketingLinkRow } from "@/src/lib/marketing-links";

const QR_RENDER_SIZE = 400;

interface QrCodeDialogProps {
  link: MarketingLinkRow | null;
  onOpenChange: (open: boolean) => void;
}

function sanitizeFilename(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9-_\s]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "QR-Code"
  );
}

function getSvgElement(): SVGSVGElement | null {
  return document.getElementById("qr-code-svg") as SVGSVGElement | null;
}

export function QrCodeDialog({ link, onOpenChange }: QrCodeDialogProps) {
  const baseFilename = link ? `QR-${sanitizeFilename(link.title)}` : "QR-Code";

  const downloadSVG = () => {
    const svg = getSvgElement();
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${baseFilename}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    const svg = getSvgElement();
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(blob);

    const canvas = document.createElement("canvas");
    canvas.width = QR_RENDER_SIZE;
    canvas.height = QR_RENDER_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(svgUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, QR_RENDER_SIZE, QR_RENDER_SIZE);
      ctx.drawImage(img, 0, 0, QR_RENDER_SIZE, QR_RENDER_SIZE);
      URL.revokeObjectURL(svgUrl);

      const pngUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = pngUrl;
      anchor.download = `${baseFilename}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    };
    img.src = svgUrl;
  };

  return (
    <DialogLayout open={link !== null} onOpenChange={onOpenChange}>
      <div className="flex w-[400px] max-w-full flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-heading-3 font-heading-3 text-default-font">
            QR Code
          </span>
          {link ? (
            <span className="text-body font-body text-subtext-color">
              {link.title}
            </span>
          ) : null}
        </div>

        {link ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border border-solid border-neutral-border bg-white p-4">
              <QRCode
                id="qr-code-svg"
                value={link.short_url}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
            <span className="text-caption font-caption text-subtext-color break-all text-center">
              {link.short_url}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="neutral-tertiary"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="neutral-secondary"
            icon={<FeatherDownload />}
            onClick={downloadSVG}
          >
            SVG
          </Button>
          <Button
            type="button"
            variant="brand-primary"
            icon={<FeatherDownload />}
            onClick={downloadPNG}
          >
            PNG
          </Button>
        </div>
      </div>
    </DialogLayout>
  );
}

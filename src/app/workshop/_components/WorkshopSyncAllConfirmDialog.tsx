"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";

interface WorkshopSyncAllConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function WorkshopSyncAllConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: WorkshopSyncAllConfirmDialogProps) {
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (open) setStarting(false);
  }, [open]);

  return (
    <DialogLayout open={open} onOpenChange={onOpenChange}>
      <div className="flex w-[480px] max-w-full flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-heading-3 font-heading-3 text-default-font">
            Sync all reserved orders?
          </span>
          <span className="text-body font-body text-subtext-color">
            This can take several minutes. Stay on this page until it finishes.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="neutral-tertiary"
            disabled={starting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={starting}
            disabled={starting}
            onClick={() => {
              if (starting) return;
              setStarting(true);
              onOpenChange(false);
              onConfirm();
            }}
          >
            Start sync
          </Button>
        </div>
      </div>
    </DialogLayout>
  );
}

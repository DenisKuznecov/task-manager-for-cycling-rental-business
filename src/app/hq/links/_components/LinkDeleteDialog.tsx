"use client";

import React from "react";
import { FeatherTrash2 } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";

interface LinkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkTitle: string;
  error: string | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function LinkDeleteDialog({
  open,
  onOpenChange,
  linkTitle,
  error,
  isDeleting,
  onConfirm,
}: LinkDeleteDialogProps) {
  return (
    <DialogLayout open={open} onOpenChange={onOpenChange}>
      <div className="flex w-[480px] max-w-full flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-heading-3 font-heading-3 text-default-font">
            Delete Link?
          </span>
          <span className="text-body font-body text-subtext-color">
            Permanently delete &ldquo;{linkTitle}&rdquo;? The short link will be
            removed from Short.io and cannot be recovered.
          </span>
        </div>

        {error ? (
          <span className="text-caption font-caption text-error-700">
            {error}
          </span>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="neutral-tertiary"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive-primary"
            icon={<FeatherTrash2 />}
            loading={isDeleting}
            disabled={isDeleting}
            onClick={onConfirm}
          >
            Delete Link
          </Button>
        </div>
      </div>
    </DialogLayout>
  );
}

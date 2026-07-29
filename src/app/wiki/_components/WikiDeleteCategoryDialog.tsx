"use client";

import React from "react";
import { FeatherTrash2 } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import type { DeleteWikiCategoryMode } from "@/src/lib/wiki/types/schema";

interface WikiDeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  documentCount: number;
  error: string | null;
  isDeleting: boolean;
  onConfirm: (mode: DeleteWikiCategoryMode | null) => void;
}

export function WikiDeleteCategoryDialog({
  open,
  onOpenChange,
  categoryName,
  documentCount,
  error,
  isDeleting,
  onConfirm,
}: WikiDeleteCategoryDialogProps) {
  const hasDocuments = documentCount > 0;

  return (
    <DialogLayout open={open} onOpenChange={onOpenChange}>
      <div className="flex w-[520px] max-w-full flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-heading-3 font-heading-3 text-default-font">
            Delete category?
          </span>
          {hasDocuments ? (
            <span className="text-body font-body text-subtext-color">
              &ldquo;{categoryName}&rdquo; has {documentCount}{" "}
              {documentCount === 1 ? "document" : "documents"}. Choose whether
              to delete those documents or move them to Uncategorized.
            </span>
          ) : (
            <span className="text-body font-body text-subtext-color">
              Permanently delete &ldquo;{categoryName}&rdquo;? This cannot be
              undone.
            </span>
          )}
        </div>

        {error ? (
          <span className="text-caption font-caption text-error-700">
            {error}
          </span>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="neutral-tertiary"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {hasDocuments ? (
            <>
              <Button
                type="button"
                variant="neutral-secondary"
                loading={isDeleting}
                disabled={isDeleting}
                onClick={() => onConfirm("unassign")}
              >
                Move to Uncategorized
              </Button>
              <Button
                type="button"
                variant="destructive-primary"
                icon={<FeatherTrash2 />}
                loading={isDeleting}
                disabled={isDeleting}
                onClick={() => onConfirm("delete_documents")}
              >
                Delete documents
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive-primary"
              icon={<FeatherTrash2 />}
              loading={isDeleting}
              disabled={isDeleting}
              onClick={() => onConfirm(null)}
            >
              Delete category
            </Button>
          )}
        </div>
      </div>
    </DialogLayout>
  );
}

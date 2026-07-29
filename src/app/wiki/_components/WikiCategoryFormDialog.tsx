"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FeatherTrash2 } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { TextField } from "@/ui/components/TextField";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import {
  createWikiCategory,
  deleteWikiCategory,
  updateWikiCategory,
} from "@/src/lib/wiki/actions/wiki-category-actions";
import {
  DEFAULT_WIKI_CATEGORY_ICON,
  type WikiCategory,
  type WikiCategoryIcon,
} from "@/src/lib/wiki/types/records";
import type { DeleteWikiCategoryMode } from "@/src/lib/wiki/types/schema";
import { WikiCategoryIconPicker } from "./WikiCategoryIconPicker";
import { WikiDeleteCategoryDialog } from "./WikiDeleteCategoryDialog";

interface WikiCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this category (with delete). Otherwise create. */
  category?: WikiCategory | null;
}

export function WikiCategoryFormDialog({
  open,
  onOpenChange,
  category = null,
}: WikiCategoryFormDialogProps) {
  const router = useRouter();
  const isEdit = category !== null;

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<WikiCategoryIcon>(DEFAULT_WIKI_CATEGORY_ICON);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDocumentCount, setDeleteDocumentCount] = useState(0);
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setDeleteOpen(false);
    setDeleteError(null);
    setDeleteDocumentCount(category?.document_count ?? 0);
    if (category) {
      setName(category.name);
      setIcon(category.icon);
    } else {
      setName("");
      setIcon(DEFAULT_WIKI_CATEGORY_ICON);
    }
  }, [open, category]);

  const handleSave = () => {
    if (isSaving) return;
    setFormError(null);
    startSaving(async () => {
      const payload = { name, icon };
      const result =
        isEdit && category
          ? await updateWikiCategory(category.id, payload)
          : await createWikiCategory(payload);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
      if (!isEdit) {
        router.push(`/wiki/category/${result.slug}`);
      }
    });
  };

  const handleDeleteConfirm = (deleteMode: DeleteWikiCategoryMode | null) => {
    if (!category || isDeleting) return;
    setDeleteError(null);
    startDeleting(async () => {
      const result = await deleteWikiCategory(category.id, deleteMode);
      if (!result.ok) {
        if (result.needsMode && typeof result.documentCount === "number") {
          setDeleteDocumentCount(result.documentCount);
        }
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
      onOpenChange(false);
      router.push("/wiki");
      router.refresh();
    });
  };

  return (
    <>
      <DialogLayout open={open} onOpenChange={onOpenChange}>
        <div className="flex w-[560px] max-w-full flex-col gap-4 p-6">
          <span className="text-heading-3 font-heading-3 text-default-font">
            {isEdit ? "Edit category" : "New category"}
          </span>

          <div className="flex flex-col gap-4">
            <TextField label="Name" helpText="">
              <TextField.Input
                value={name}
                placeholder="Category name"
                disabled={isSaving}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setName(event.target.value)
                }
              />
            </TextField>

            <WikiCategoryIconPicker
              value={icon}
              onChange={setIcon}
              disabled={isSaving}
            />

            {formError ? (
              <span className="text-caption font-caption text-error-700">
                {formError}
              </span>
            ) : null}

            <div className="flex items-center justify-between gap-2 pt-2">
              <div>
                {isEdit ? (
                  <Button
                    type="button"
                    variant="destructive-secondary"
                    icon={<FeatherTrash2 />}
                    disabled={isSaving}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="neutral-tertiary"
                  disabled={isSaving}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="brand-primary"
                  loading={isSaving}
                  disabled={isSaving || !name.trim()}
                  onClick={handleSave}
                >
                  {isEdit ? "Save" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogLayout>

      {isEdit && category ? (
        <WikiDeleteCategoryDialog
          open={deleteOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !isDeleting) {
              setDeleteOpen(false);
              setDeleteError(null);
            }
          }}
          categoryName={category.name}
          documentCount={deleteDocumentCount}
          error={deleteError}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}

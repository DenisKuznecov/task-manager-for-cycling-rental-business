"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FeatherArrowDown,
  FeatherArrowUp,
  FeatherPlus,
  FeatherTrash2,
} from "@subframe/core";
import { Alert } from "@/ui/components/Alert";
import { Button } from "@/ui/components/Button";
import { Checkbox } from "@/ui/components/Checkbox";
import { IconButton } from "@/ui/components/IconButton";
import { Select } from "@/ui/components/Select";
import { TextField } from "@/ui/components/TextField";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import {
  addDraftChecklistItem,
  removeDraftChecklistItem,
  reorderDraftChecklistItems,
  updateDraftChecklistItem,
} from "@/src/lib/workshop-tasks/actions/checklist-item-actions";
import type { ChecklistItemMutationResult } from "@/src/lib/workshop-tasks/checklist-item-mutation";
import {
  DraftChecklistItemFieldsSchema,
  LABEL_REQUIRED_MESSAGE,
  M2_REQUIRES_M1_MESSAGE,
  WORKSHOP_CHECKLIST_ITEM_TYPE_LABELS,
  WORKSHOP_CHECKLIST_ITEM_TYPES,
  WORKSHOP_CHECKLIST_STATUS_LABELS,
  WORKSHOP_SETUP_CATEGORIES,
  WORKSHOP_SETUP_CATEGORY_LABELS,
  type DraftChecklistItemFields,
  type WorkshopChecklistItem,
  type WorkshopChecklistStatus,
  type WorkshopChecklistVersion,
  type WorkshopSetupCategory,
} from "@/src/lib/workshop-tasks/types";

const NONE_SETUP_CATEGORY = "none";
const EMPTY_ITEM_FIELDS: DraftChecklistItemFields = {
  label: "",
  type: "action",
  required: false,
  m1: false,
  m2: false,
  setupCategory: null,
};

export type DraftItemControl =
  | "add"
  | `save:${string}`
  | `remove:${string}`
  | `move:${string}`;

export function m2FieldError(
  fields: Pick<DraftChecklistItemFields, "m1" | "m2">,
): string | null {
  return fields.m2 && !fields.m1 ? M2_REQUIRES_M1_MESSAGE : null;
}

export function fieldsFromItem(
  item: WorkshopChecklistItem,
): DraftChecklistItemFields {
  return {
    label: item.label,
    type: item.type,
    required: item.required,
    m1: item.m1,
    m2: item.m2,
    setupCategory: item.setupCategory,
  };
}

export function moveItemIds(
  ids: readonly string[],
  itemId: string,
  direction: "up" | "down",
): string[] | null {
  const index = ids.indexOf(itemId);
  if (index < 0) return null;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ids.length) return null;
  const next = [...ids];
  const current = next[index];
  const other = next[swapWith];
  if (current === undefined || other === undefined) return null;
  next[index] = other;
  next[swapWith] = current;
  return next;
}

export function buildReorderInput(
  versionId: string,
  expectedRevision: number,
  itemIds: readonly string[],
) {
  return {
    versionId,
    expectedRevision,
    itemIds: [...itemIds],
  };
}

export function applyChecklistItemMutationResult(
  state: { revision: number; status: WorkshopChecklistStatus },
  result: ChecklistItemMutationResult,
): {
  revision: number;
  status: WorkshopChecklistStatus;
  keepValues: boolean;
  saved: boolean;
  stale: boolean;
  error: string | null;
} {
  if (result.ok) {
    return {
      revision: result.revision,
      status: state.status,
      keepValues: false,
      saved: true,
      stale: false,
      error: null,
    };
  }

  return {
    revision: result.stale ? (result.revision ?? state.revision) : state.revision,
    status: result.stale ? (result.status ?? state.status) : state.status,
    keepValues: true,
    saved: false,
    stale: result.stale === true,
    error: result.error,
  };
}

export function draftItemFieldsEqual(
  left: DraftChecklistItemFields,
  right: DraftChecklistItemFields,
): boolean {
  return (
    left.label === right.label &&
    left.type === right.type &&
    left.required === right.required &&
    left.m1 === right.m1 &&
    left.m2 === right.m2 &&
    left.setupCategory === right.setupCategory
  );
}

export type DraftEditorSyncState = {
  revision: number;
  status: WorkshopChecklistStatus;
  stale: boolean;
  itemDrafts: Record<string, DraftChecklistItemFields>;
  itemOrder: string[];
};

/**
 * Props-sync for the draft editor. While stale, kept drafts/revision/order
 * must not be overwritten by a newer `version`. When current, keep rows that
 * still differ from the loaded item and reset rows that match the server.
 */
export function syncDraftEditorFromVersion(
  state: DraftEditorSyncState,
  version: Pick<WorkshopChecklistVersion, "items" | "revision" | "status">,
): Omit<DraftEditorSyncState, "stale"> {
  if (state.stale) {
    return {
      revision: state.revision,
      status: state.status,
      itemDrafts: state.itemDrafts,
      itemOrder: state.itemOrder,
    };
  }

  const itemDrafts: Record<string, DraftChecklistItemFields> = {};
  for (const item of version.items) {
    const loaded = fieldsFromItem(item);
    const current = state.itemDrafts[item.id];
    itemDrafts[item.id] =
      current && !draftItemFieldsEqual(current, loaded) ? current : loaded;
  }

  return {
    revision: version.revision,
    status: version.status,
    itemDrafts,
    itemOrder: version.items.map((item) => item.id),
  };
}

export function orderedChecklistItems(
  items: readonly WorkshopChecklistItem[],
  itemOrder: readonly string[],
): WorkshopChecklistItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: WorkshopChecklistItem[] = [];
  const seen = new Set<string>();
  for (const id of itemOrder) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      seen.add(id);
    }
  }
  for (const item of items) {
    if (!seen.has(item.id)) ordered.push(item);
  }
  return ordered;
}

type LastDraftItemAction =
  | { type: "add" }
  | { type: "save"; itemId: string }
  | { type: "remove"; itemId: string }
  | { type: "move"; itemId: string; direction: "up" | "down" };

export function rejectInvalidDraftItemFields(
  fields: DraftChecklistItemFields,
): { ok: false; error: string; field: "label" | "m2" } | null {
  const parsed = DraftChecklistItemFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] === "label" ? "label" : "m2";
    return {
      ok: false,
      error:
        field === "label"
          ? (issue?.message ?? LABEL_REQUIRED_MESSAGE)
          : (m2FieldError(fields) ?? issue?.message ?? M2_REQUIRES_M1_MESSAGE),
      field,
    };
  }
  return null;
}

export async function submitDraftItemFields(
  fields: DraftChecklistItemFields,
  isPending: boolean,
  save: (fields: DraftChecklistItemFields) => Promise<ChecklistItemMutationResult>,
): Promise<
  | ChecklistItemMutationResult
  | { ok: false; error: string; field: "label" | "m2" }
  | null
> {
  const rejected = rejectInvalidDraftItemFields(fields);
  if (rejected) return rejected;
  if (isPending) return null;
  return save(fields);
}

interface DraftChecklistItemsEditorProps {
  version: WorkshopChecklistVersion;
}

export function DraftChecklistItemsEditor({
  version,
}: DraftChecklistItemsEditorProps) {
  const router = useRouter();
  const [revision, setRevision] = useState(version.revision);
  const [status, setStatus] = useState(version.status);
  const [addFields, setAddFields] =
    useState<DraftChecklistItemFields>(EMPTY_ITEM_FIELDS);
  const [itemDrafts, setItemDrafts] = useState<
    Record<string, DraftChecklistItemFields>
  >(() => Object.fromEntries(version.items.map((item) => [item.id, fieldsFromItem(item)])));
  const [itemOrder, setItemOrder] = useState<string[]>(() =>
    version.items.map((item) => item.id),
  );
  const [pendingControl, setPendingControl] = useState<DraftItemControl | null>(
    null,
  );
  const [savedControl, setSavedControl] = useState<DraftItemControl | null>(null);
  const [stale, setStale] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [addLabelError, setAddLabelError] = useState<string | null>(null);
  const [addM2Error, setAddM2Error] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [itemLabelErrors, setItemLabelErrors] = useState<Record<string, string>>(
    {},
  );
  const [removeTarget, setRemoveTarget] = useState<WorkshopChecklistItem | null>(
    null,
  );
  const lastActionRef = useRef<LastDraftItemAction | null>(null);
  const revisionRef = useRef(revision);
  const statusRef = useRef(status);
  const addFieldsRef = useRef(addFields);
  const itemDraftsRef = useRef(itemDrafts);
  const itemOrderRef = useRef(itemOrder);
  revisionRef.current = revision;
  statusRef.current = status;
  addFieldsRef.current = addFields;
  itemDraftsRef.current = itemDrafts;
  itemOrderRef.current = itemOrder;

  useEffect(() => {
    const next = syncDraftEditorFromVersion(
      {
        stale,
        revision: revisionRef.current,
        status: statusRef.current,
        itemDrafts: itemDraftsRef.current,
        itemOrder: itemOrderRef.current,
      },
      {
        items: version.items,
        revision: version.revision,
        status: version.status,
      },
    );
    setRevision(next.revision);
    setStatus(next.status);
    setItemDrafts(next.itemDrafts);
    setItemOrder(next.itemOrder);
  }, [stale, version.items, version.revision, version.status]);

  const orderedItems = orderedChecklistItems(version.items, itemOrder);

  function applyResult(
    control: DraftItemControl,
    result: ChecklistItemMutationResult,
    onSuccess?: () => void,
  ) {
    const next = applyChecklistItemMutationResult(
      { revision: revisionRef.current, status: statusRef.current },
      result,
    );
    setRevision(next.revision);
    setStatus(next.status);
    setStale(next.stale);
    setBannerError(next.error);
    if (next.saved) {
      setSavedControl(control);
      onSuccess?.();
      router.refresh();
    }
  }

  async function runMutation(
    control: DraftItemControl,
    action: LastDraftItemAction,
    mutate: () => Promise<ChecklistItemMutationResult>,
    onSuccess?: () => void,
  ) {
    if (pendingControl) return;
    setPendingControl(control);
    setSavedControl(null);
    setBannerError(null);
    lastActionRef.current = action;
    try {
      const result = await mutate();
      applyResult(control, result, onSuccess);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Couldn't save items. Please try again.";
      setBannerError(message);
      setStale(false);
    } finally {
      setPendingControl(null);
    }
  }

  async function handleAdd() {
    const fields = addFieldsRef.current;
    const rejected = rejectInvalidDraftItemFields(fields);
    if (rejected) {
      if (rejected.field === "label") {
        setAddLabelError(rejected.error);
        setAddM2Error(null);
      } else {
        setAddM2Error(rejected.error);
        setAddLabelError(null);
      }
      return;
    }
    setAddLabelError(null);
    setAddM2Error(null);
    await runMutation(
      "add",
      { type: "add" },
      () =>
        addDraftChecklistItem({
          versionId: version.id,
          expectedRevision: revisionRef.current,
          ...addFieldsRef.current,
        }),
      () => {
        setAddFields(EMPTY_ITEM_FIELDS);
      },
    );
  }

  async function handleSave(itemId: string) {
    const item = version.items.find((entry) => entry.id === itemId);
    const fields =
      itemDraftsRef.current[itemId] ??
      (item ? fieldsFromItem(item) : EMPTY_ITEM_FIELDS);
    const rejected = rejectInvalidDraftItemFields(fields);
    if (rejected) {
      if (rejected.field === "label") {
        setItemLabelErrors((current) => ({ ...current, [itemId]: rejected.error }));
        setItemErrors((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      } else {
        setItemErrors((current) => ({ ...current, [itemId]: rejected.error }));
        setItemLabelErrors((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      }
      return;
    }
    setItemErrors((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setItemLabelErrors((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    await runMutation(`save:${itemId}`, { type: "save", itemId }, () =>
      updateDraftChecklistItem({
        versionId: version.id,
        itemId,
        expectedRevision: revisionRef.current,
        ...(itemDraftsRef.current[itemId] ?? fields),
      }),
    );
  }

  async function handleReorder(itemId: string, direction: "up" | "down") {
    const itemIds = moveItemIds(itemOrderRef.current, itemId, direction);
    if (!itemIds) return;
    await runMutation(
      `move:${itemId}`,
      { type: "move", itemId, direction },
      () =>
        reorderDraftChecklistItems(
          buildReorderInput(version.id, revisionRef.current, itemIds),
        ),
      () => {
        setItemOrder(itemIds);
      },
    );
  }

  async function handleRemove() {
    const itemId = removeTarget?.id ?? (
      lastActionRef.current?.type === "remove"
        ? lastActionRef.current.itemId
        : null
    );
    if (!itemId) return;
    await runMutation(
      `remove:${itemId}`,
      { type: "remove", itemId },
      () =>
        removeDraftChecklistItem({
          versionId: version.id,
          itemId,
          expectedRevision: revisionRef.current,
        }),
      () => {
        setItemOrder((current) => current.filter((id) => id !== itemId));
      },
    );
    setRemoveTarget(null);
  }

  function retryLastAction() {
    const action = lastActionRef.current;
    if (!action) return;
    if (action.type === "add") {
      void handleAdd();
      return;
    }
    if (action.type === "save") {
      void handleSave(action.itemId);
      return;
    }
    if (action.type === "move") {
      void handleReorder(action.itemId, action.direction);
      return;
    }
    void handleRemove();
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {orderedItems.length === 0 ? (
        <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-border px-6 py-8">
          <p className="text-body font-body text-default-font">
            This version has no items yet.
          </p>
          <p className="text-caption font-caption text-subtext-color">
            A version with no items is a valid checklist definition.
          </p>
        </div>
      ) : null}

      {bannerError ? (
        <Alert
          variant={stale ? "warning" : "error"}
          title={stale ? "This draft changed" : "Couldn't save items"}
          description={
            stale
              ? `${bannerError} Current revision ${revision} · ${WORKSHOP_CHECKLIST_STATUS_LABELS[status]}. Your entered values were kept.`
              : bannerError
          }
          actions={
            bannerError ? (
              <Button
                variant="neutral-secondary"
                size="small"
                onClick={() => retryLastAction()}
              >
                Retry
              </Button>
            ) : null
          }
        />
      ) : null}

      {orderedItems.map((item, index) => {
        const fields = itemDrafts[item.id] ?? fieldsFromItem(item);
        const itemM2Error = itemErrors[item.id] ?? m2FieldError(fields);
        return (
          <DraftItemForm
            key={item.id}
            fields={fields}
            labelError={itemLabelErrors[item.id] ?? null}
            m2Error={itemM2Error}
            canMoveUp={index > 0}
            canMoveDown={index < orderedItems.length - 1}
            pendingControl={pendingControl}
            savedControl={savedControl}
            itemId={item.id}
            onChange={(next) => {
              setSavedControl(null);
              setItemDrafts((current) => ({ ...current, [item.id]: next }));
            }}
            onSave={() => handleSave(item.id)}
            onMoveUp={() => handleReorder(item.id, "up")}
            onMoveDown={() => handleReorder(item.id, "down")}
            onRemove={() => setRemoveTarget(item)}
          />
        );
      })}

      <AddItemForm
        fields={addFields}
        labelError={addLabelError}
        m2Error={addM2Error ?? m2FieldError(addFields)}
        pending={pendingControl === "add"}
        disabled={pendingControl !== null}
        saved={savedControl === "add"}
        onChange={(next) => {
          setSavedControl(null);
          setAddFields(next);
          setAddM2Error(m2FieldError(next));
          setAddLabelError(null);
        }}
        onAdd={() => {
          void handleAdd();
        }}
      />

      <DialogLayout
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <div className="flex w-[480px] max-w-full flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-heading-3 font-heading-3 text-default-font">
              Remove item?
            </span>
            <span className="text-body font-body text-subtext-color">
              Remove “{removeTarget?.label || "this item"}” from this draft?
              Active and superseded versions are not changed.
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="neutral-tertiary"
              disabled={pendingControl?.startsWith("remove:") === true}
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive-primary"
              icon={<FeatherTrash2 />}
              loading={pendingControl?.startsWith("remove:") === true}
              disabled={pendingControl?.startsWith("remove:") === true}
              onClick={() => {
                void handleRemove();
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      </DialogLayout>
    </div>
  );
}

function AddItemForm({
  fields,
  labelError,
  m2Error,
  pending,
  disabled,
  saved,
  onChange,
  onAdd,
}: {
  fields: DraftChecklistItemFields;
  labelError: string | null;
  m2Error: string | null;
  pending: boolean;
  disabled: boolean;
  saved: boolean;
  onChange: (fields: DraftChecklistItemFields) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border p-4">
      <h3 className="text-body-bold font-body-bold text-default-font">
        Add Item
      </h3>
      <ItemFields
        fields={fields}
        labelError={labelError}
        m2Error={m2Error}
        onChange={onChange}
      />
      <div className="flex items-center gap-3">
        <Button
          variant="brand-primary"
          icon={<FeatherPlus />}
          loading={pending}
          disabled={disabled}
          onClick={onAdd}
        >
          Add Item
        </Button>
        {saved ? (
          <span className="text-caption font-caption text-success-700">Saved</span>
        ) : null}
      </div>
    </div>
  );
}

function DraftItemForm({
  fields,
  labelError,
  m2Error,
  canMoveUp,
  canMoveDown,
  pendingControl,
  savedControl,
  itemId,
  onChange,
  onSave,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  fields: DraftChecklistItemFields;
  labelError: string | null;
  m2Error: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pendingControl: DraftItemControl | null;
  savedControl: DraftItemControl | null;
  itemId: string;
  onChange: (fields: DraftChecklistItemFields) => void;
  onSave: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const savePending = pendingControl === `save:${itemId}`;
  const movePending = pendingControl === `move:${itemId}`;
  const removePending = pendingControl === `remove:${itemId}`;

  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border p-4">
      <ItemFields
        fields={fields}
        labelError={labelError}
        m2Error={m2Error}
        onChange={onChange}
      />
      <div className="flex w-full flex-wrap items-center gap-2">
        <Button
          variant="brand-secondary"
          loading={savePending}
          disabled={pendingControl !== null}
          onClick={onSave}
        >
          Save
        </Button>
        <IconButton
          variant="neutral-tertiary"
          icon={<FeatherArrowUp />}
          aria-label="Move up"
          disabled={!canMoveUp || pendingControl !== null}
          loading={movePending}
          onClick={onMoveUp}
        />
        <IconButton
          variant="neutral-tertiary"
          icon={<FeatherArrowDown />}
          aria-label="Move down"
          disabled={!canMoveDown || pendingControl !== null}
          loading={movePending}
          onClick={onMoveDown}
        />
        <Button
          variant="destructive-tertiary"
          icon={<FeatherTrash2 />}
          loading={removePending}
          disabled={pendingControl !== null}
          onClick={onRemove}
        >
          Remove
        </Button>
        {savedControl === `save:${itemId}` ||
        savedControl === `move:${itemId}` ||
        savedControl === `remove:${itemId}` ? (
          <span className="text-caption font-caption text-success-700">Saved</span>
        ) : null}
      </div>
    </div>
  );
}

function ItemFields({
  fields,
  labelError,
  m2Error,
  onChange,
}: {
  fields: DraftChecklistItemFields;
  labelError: string | null;
  m2Error: string | null;
  onChange: (fields: DraftChecklistItemFields) => void;
}) {
  return (
    <div className="grid w-full grid-cols-2 gap-4 mobile:grid-cols-1">
      <TextField
        label="Label"
        error={Boolean(labelError)}
        helpText={labelError}
        className="col-span-2 mobile:col-span-1"
      >
        <TextField.Input
          value={fields.label}
          onChange={(event) =>
            onChange({ ...fields, label: event.target.value })
          }
        />
      </TextField>
      <Select
        label="Type"
        value={fields.type}
        onValueChange={(value) =>
          onChange({
            ...fields,
            type: value as DraftChecklistItemFields["type"],
          })
        }
      >
        {WORKSHOP_CHECKLIST_ITEM_TYPES.map((type) => (
          <Select.Item key={type} value={type}>
            {WORKSHOP_CHECKLIST_ITEM_TYPE_LABELS[type]}
          </Select.Item>
        ))}
      </Select>
      <Select
        label="Setup category"
        placeholder="None"
        value={fields.setupCategory ?? NONE_SETUP_CATEGORY}
        onValueChange={(value) =>
          onChange({
            ...fields,
            setupCategory:
              value === NONE_SETUP_CATEGORY
                ? null
                : (value as WorkshopSetupCategory),
          })
        }
      >
        <Select.Item value={NONE_SETUP_CATEGORY}>None</Select.Item>
        {WORKSHOP_SETUP_CATEGORIES.map((category) => (
          <Select.Item key={category} value={category}>
            {WORKSHOP_SETUP_CATEGORY_LABELS[category]}
          </Select.Item>
        ))}
      </Select>
      <Checkbox
        label="Required"
        checked={fields.required}
        onCheckedChange={(checked) =>
          onChange({ ...fields, required: checked === true })
        }
      />
      <Checkbox
        label="M1"
        checked={fields.m1}
        onCheckedChange={(checked) =>
          onChange({ ...fields, m1: checked === true })
        }
      />
      <div className="flex flex-col gap-1">
        <Checkbox
          label="M2"
          checked={fields.m2}
          onCheckedChange={(checked) =>
            onChange({ ...fields, m2: checked === true })
          }
        />
        {m2Error ? (
          <span className="text-caption font-caption text-error-700">
            {m2Error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

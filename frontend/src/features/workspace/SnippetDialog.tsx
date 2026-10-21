import { useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

interface SnippetDialogProps {
  open: boolean;
  code: string;
  /** When set, the dialog updates this snippet instead of creating one. */
  editingId: number | null;
  initialName?: string;
  onClose: () => void;
  onSaved: (id: number, name: string) => void;
}

/** Save-as-snippet dialog (POST /snippets or PUT /snippets/{id}). */
export function SnippetDialog({
  open,
  code,
  editingId,
  initialName = "",
  onClose,
  onSaved,
}: SnippetDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give your snippet a name.");
      return;
    }
    if (trimmed.length > 80) {
      setError("Name must be 80 characters or fewer.");
      return;
    }
    setSaving(true);
    try {
      const saved =
        editingId === null
          ? await api.createSnippet({ name: trimmed, code })
          : await api.updateSnippet(editingId, { name: trimmed, code });
      toast.success(editingId === null ? "Snippet saved." : "Snippet updated.");
      onSaved(saved.id, saved.name);
      onClose();
    } catch {
      setError("Could not save the snippet. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editingId === null ? "Save snippet" : "Update snippet"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={saving}>
            {editingId === null ? "Save" : "Update"}
          </Button>
        </>
      }
    >
      <div data-testid="save-snippet-modal">
        <Input
          label="Snippet name"
          value={name}
          autoFocus
          maxLength={80}
          placeholder="e.g. Factorial, My first program"
          error={error}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void onSave();
          }}
        />
        <p className="mt-3 text-xs text-brand-brown-500">
          {code.length} characters will be saved with this name.
        </p>
      </div>
    </Modal>
  );
}

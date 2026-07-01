import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi } from "../../lib/api";
import type { AiKnowledge } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

interface Draft {
  topic: string;
  content: string;
}

const EMPTY_DRAFT: Draft = { topic: "", content: "" };

export function KnowledgeAdmin() {
  const [entries, setEntries] = useState<AiKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await adminApi.listKnowledge();
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.topic.trim() || !draft.content.trim()) return;
    setSaving(true);
    try {
      await adminApi.createKnowledge({
        topic: draft.topic.trim(),
        content: draft.content.trim(),
        is_active: true,
      });
      setDraft(EMPTY_DRAFT);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateContent(entry: AiKnowledge, content: string) {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, content } : e)));
  }

  async function handleBlurSave(entry: AiKnowledge) {
    await adminApi.updateKnowledge(entry.id, { content: entry.content });
  }

  async function handleToggleActive(entry: AiKnowledge) {
    await adminApi.updateKnowledge(entry.id, { is_active: !entry.is_active });
    await load();
  }

  async function handleDelete(id: string) {
    await adminApi.deleteKnowledge(id);
    await load();
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-blush-900">Edit AI Knowledge</h1>
      <p className="mt-1 text-sm text-blush-800/70">
        This content is injected directly into the AI receptionist's context — edits take effect
        on the very next customer message.
      </p>

      <Card className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-blush-900">Add Knowledge Entry</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <Input
            label="Topic (e.g. 'loyalty_program')"
            value={draft.topic}
            onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
            required
          />
          <Textarea
            label="Content"
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            required
          />
          <Button type="submit" disabled={saving}>
            {saving ? <LoadingSpinner className="border-white/40 border-t-white" /> : "Add Entry"}
          </Button>
        </form>
      </Card>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-sm font-semibold text-blush-900">{entry.topic}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    entry.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {entry.is_active ? "active" : "inactive"}
                </span>
              </div>
              <textarea
                value={entry.content}
                onChange={(e) => void handleUpdateContent(entry, e.target.value)}
                onBlur={() => void handleBlurSave(entry)}
                className="input-field mt-3 min-h-[80px] resize-y"
              />
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => void handleToggleActive(entry)}>
                  {entry.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="secondary" onClick={() => void handleDelete(entry.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

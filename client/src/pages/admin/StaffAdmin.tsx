import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi } from "../../lib/api";
import type { Staff } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

interface Draft {
  full_name: string;
  title: string;
  bio: string;
}

const EMPTY_DRAFT: Draft = { full_name: "", title: "Nail Technician", bio: "" };

export function StaffAdmin() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await adminApi.listStaff();
    setStaff(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.full_name.trim()) return;
    setSaving(true);
    try {
      await adminApi.createStaff({
        full_name: draft.full_name.trim(),
        title: draft.title.trim() || null,
        bio: draft.bio.trim() || null,
        is_active: true,
      });
      setDraft(EMPTY_DRAFT);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(member: Staff) {
    await adminApi.updateStaff(member.id, { is_active: !member.is_active });
    await load();
  }

  async function handleDelete(id: string) {
    await adminApi.deleteStaff(id);
    await load();
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-blush-900">Manage Staff</h1>

      <Card className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-blush-900">Add Technician</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={draft.full_name}
            onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
            required
          />
          <Input
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <Input
            label="Bio (optional)"
            className="sm:col-span-2"
            value={draft.bio}
            onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          />
          <Button type="submit" disabled={saving} className="sm:col-span-2">
            {saving ? <LoadingSpinner className="border-white/40 border-t-white" /> : "Add Staff"}
          </Button>
        </form>
      </Card>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {staff.map((member) => (
            <Card key={member.id}>
              <h3 className="font-serif font-semibold text-blush-900">{member.full_name}</h3>
              <p className="text-xs uppercase tracking-wide text-gold-500">{member.title}</p>
              {member.bio && <p className="mt-2 text-sm text-blush-800/70">{member.bio}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => void handleToggleActive(member)}>
                  {member.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="secondary" onClick={() => void handleDelete(member.id)}>
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

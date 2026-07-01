import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi } from "../../lib/api";
import type { BusinessHour } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function HoursAdmin() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const data = await adminApi.listHours();
    setHours(data.sort((a, b) => a.day_of_week - b.day_of_week));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function updateLocal(day: number, patch: Partial<BusinessHour>) {
    setHours((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)));
  }

  async function handleSave(day: BusinessHour) {
    setSavingDay(day.day_of_week);
    try {
      await adminApi.upsertHours(day);
    } finally {
      setSavingDay(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-blush-900">Manage Business Hours</h1>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <Card className="mt-6">
          <div className="space-y-3">
            {hours.map((day) => (
              <div
                key={day.day_of_week}
                className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-blush-50 p-4 sm:grid-cols-5"
              >
                <span className="font-medium text-blush-900">{DAY_NAMES[day.day_of_week]}</span>

                <label className="flex items-center gap-2 text-sm text-blush-800">
                  <input
                    type="checkbox"
                    checked={day.is_closed}
                    onChange={(e) => updateLocal(day.day_of_week, { is_closed: e.target.checked })}
                  />
                  Closed
                </label>

                <input
                  type="time"
                  disabled={day.is_closed}
                  value={day.open_time ?? ""}
                  onChange={(e) => updateLocal(day.day_of_week, { open_time: e.target.value })}
                  className="input-field disabled:opacity-40"
                />

                <input
                  type="time"
                  disabled={day.is_closed}
                  value={day.close_time ?? ""}
                  onChange={(e) => updateLocal(day.day_of_week, { close_time: e.target.value })}
                  className="input-field disabled:opacity-40"
                />

                <Button
                  variant="secondary"
                  onClick={() => void handleSave(day)}
                  disabled={savingDay === day.day_of_week}
                >
                  {savingDay === day.day_of_week ? <LoadingSpinner /> : "Save"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AdminLayout>
  );
}

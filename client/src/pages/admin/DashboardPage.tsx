import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi } from "../../lib/api";
import type { Appointment, AppointmentStatus } from "../../lib/types";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

const STATUS_OPTIONS: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: "bg-gold-50 text-gold-700",
  confirmed: "bg-blush-50 text-blush-600",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  no_show: "bg-gray-100 text-gray-600",
};

export function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.listAppointments();
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    const updated = await adminApi.updateAppointmentStatus(id, status);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-blush-900">Appointments</h1>
      <p className="mt-1 text-sm text-blush-800/70">
        Marking an appointment as "completed" flags it for a Google Review follow-up.
      </p>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-blush-100 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-blush-50/60 text-left text-xs uppercase tracking-wide text-blush-800/60">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-t border-blush-50">
                  <td className="px-4 py-3 font-medium text-blush-900">{a.customer_name}</td>
                  <td className="px-4 py-3">{a.services?.name ?? "—"}</td>
                  <td className="px-4 py-3">{a.appointment_date}</td>
                  <td className="px-4 py-3">{a.appointment_time}</td>
                  <td className="px-4 py-3">{a.customer_phone}</td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) =>
                        void handleStatusChange(a.id, e.target.value as AppointmentStatus)
                      }
                      className={`rounded-full border-0 px-3 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-blush-800/50">
                    No appointments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

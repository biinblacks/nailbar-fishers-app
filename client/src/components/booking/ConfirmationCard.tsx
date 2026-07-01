import { Link } from "react-router-dom";
import type { Appointment } from "../../lib/types";
import { Card } from "../ui/Card";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [hourStr, minute] = timeStr.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

export function ConfirmationCard({ appointment }: { appointment: Appointment }) {
  return (
    <Card className="mx-auto max-w-lg text-center animate-fadeInUp">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush-50 text-3xl text-blush-500">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold text-blush-900">Appointment Requested!</h1>
      <p className="mt-2 text-sm text-blush-800/70">
        We've received your request. Our team will confirm shortly via phone or email.
      </p>

      <div className="mt-6 space-y-2 rounded-2xl bg-blush-50 p-5 text-left text-sm">
        <div className="flex justify-between">
          <span className="text-blush-800/60">Service</span>
          <span className="font-medium text-blush-900">{appointment.services?.name ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blush-800/60">Date</span>
          <span className="font-medium text-blush-900">
            {formatDate(appointment.appointment_date)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-blush-800/60">Time</span>
          <span className="font-medium text-blush-900">
            {formatTime(appointment.appointment_time)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-blush-800/60">Name</span>
          <span className="font-medium text-blush-900">{appointment.customer_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blush-800/60">Phone</span>
          <span className="font-medium text-blush-900">{appointment.customer_phone}</span>
        </div>
      </div>

      <Link to="/" className="btn-primary mt-8 w-full">
        Back to Home
      </Link>
    </Card>
  );
}

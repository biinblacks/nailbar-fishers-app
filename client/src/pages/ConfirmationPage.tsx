import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { bookingApi } from "../lib/api";
import type { Appointment } from "../lib/types";
import { ConfirmationCard } from "../components/booking/ConfirmationCard";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    bookingApi
      .getById(id)
      .then(setAppointment)
      .catch(() => setError("We couldn't find that appointment."));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      {!error && !appointment && (
        <div className="flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      )}
      {appointment && <ConfirmationCard appointment={appointment} />}
    </div>
  );
}

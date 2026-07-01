import { BookingForm } from "../components/booking/BookingForm";

export function BookingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <span className="section-eyebrow">Book Online</span>
        <h1 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">
          Schedule Your Appointment
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-blush-800/70">
          Choose your service, pick a time that works for you, and we'll take care of the rest.
        </p>
      </div>

      <div className="mt-12">
        <BookingForm />
      </div>
    </div>
  );
}

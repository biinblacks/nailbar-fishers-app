const TIME_SLOTS = [
  "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00", "18:30",
];

function formatSlotLabel(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

interface DateTimePickerProps {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export function DateTimePicker({ date, time, onDateChange, onTimeChange }: DateTimePickerProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="booking-date" className="text-sm font-medium text-blush-800">
          Date
        </label>
        <input
          id="booking-date"
          type="date"
          min={today}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="input-field mt-1.5"
          required
        />
      </div>

      <div>
        <p className="text-sm font-medium text-blush-800">Time</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onTimeChange(slot)}
              className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                time === slot
                  ? "border-blush-400 bg-blush-500 text-white"
                  : "border-blush-100 bg-white text-blush-800 hover:border-blush-300"
              }`}
            >
              {formatSlotLabel(slot)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

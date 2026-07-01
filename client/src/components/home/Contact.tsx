import { Card } from "../ui/Card";
import { useChat } from "../../context/ChatContext";

export function Contact() {
  const { open } = useChat();

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <Card className="grid gap-10 md:grid-cols-2">
        <div>
          <span className="section-eyebrow">Get In Touch</span>
          <h2 className="mt-3 text-3xl font-bold text-blush-900">Visit or Ask Us Anything</h2>
          <p className="mt-4 text-sm text-blush-800/70">
            Have a question before booking? Our AI receptionist can help instantly, or reach out
            directly using the details below.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-blush-900">
            <li>
              <span className="font-semibold">Address:</span> 8970 E 96th St, Fishers, IN 46037
            </li>
            <li>
              <span className="font-semibold">Phone:</span>{" "}
              <a href="tel:+13175550182" className="text-blush-500 hover:underline">
                (317) 555-0182
              </a>
            </li>
            <li>
              <span className="font-semibold">Email:</span>{" "}
              <a href="mailto:hello@nailbar.com" className="text-blush-500 hover:underline">
                hello@nailbar.com
              </a>
            </li>
            <li>
              <span className="font-semibold">Hours:</span> Mon–Fri 9:30 AM–7:00 PM · Sat
              9:30 AM–6:00 PM · Sun 11:00 AM–5:00 PM
            </li>
          </ul>

          <button onClick={open} className="btn-primary mt-8">
            Chat with our AI Receptionist
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <iframe
            title="Nail Bar Location"
            className="h-72 w-full rounded-2xl border-0 md:h-full"
            loading="lazy"
            src="https://maps.google.com/maps?q=8970%20E%2096th%20St%20Fishers%20IN%2046037&t=&z=14&ie=UTF8&iwloc=&output=embed"
          />
        </div>
      </Card>
    </section>
  );
}

import { Card } from "../ui/Card";

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    text: "Booked through the chatbot in under a minute and my Gel X set was flawless. The AI even remembered my usual color preference!",
    rating: 5,
  },
  {
    name: "Jenny T.",
    text: "Best pedicure in Fishers, hands down. The space is so clean and relaxing, and the staff are incredibly detail-oriented.",
    rating: 5,
  },
  {
    name: "Priya K.",
    text: "Loved being able to ask about pricing at 10pm and get an instant answer. Booked my appointment right there.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-blush-50/60 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <span className="section-eyebrow">Client Love</span>
          <h2 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">Testimonials</h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Card key={t.name} className="animate-fadeInUp" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="text-gold-400">{"★".repeat(t.rating)}</div>
              <p className="mt-4 text-sm italic text-blush-800/80">&ldquo;{t.text}&rdquo;</p>
              <p className="mt-4 text-sm font-semibold text-blush-900">{t.name}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="https://g.page/r/nailbar/review"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold"
          >
            Leave a Google Review
          </a>
        </div>
      </div>
    </section>
  );
}

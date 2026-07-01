import { Card } from "../ui/Card";

const REASONS = [
  {
    title: "24/7 AI Receptionist",
    description: "Get instant answers on pricing, hours, and availability — any time, day or night.",
    icon: "💬",
  },
  {
    title: "Expert Technicians",
    description: "Our team brings 10+ years of combined experience in nail artistry and care.",
    icon: "✨",
  },
  {
    title: "Premium, Clean Products",
    description: "We use top-tier, salon-grade products for lasting, healthy results.",
    icon: "🌿",
  },
  {
    title: "Relaxing Atmosphere",
    description: "A modern, minimal space designed for comfort from the moment you walk in.",
    icon: "🕊️",
  },
];

export function WhyChooseUs() {
  return (
    <section id="why-us" className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center">
        <span className="section-eyebrow">The Difference</span>
        <h2 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">Why Choose Us</h2>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map((reason, i) => (
          <Card
            key={reason.title}
            className="animate-fadeInUp text-center"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blush-50 text-2xl">
              {reason.icon}
            </div>
            <h3 className="mt-4 font-serif text-lg font-semibold text-blush-900">{reason.title}</h3>
            <p className="mt-2 text-sm text-blush-800/70">{reason.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

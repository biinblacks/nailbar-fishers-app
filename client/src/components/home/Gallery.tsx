const GALLERY_ITEMS = [
  { label: "Gel X Ombre", tone: "from-blush-100 to-blush-200" },
  { label: "Classic French", tone: "from-gold-50 to-gold-100" },
  { label: "Chrome Finish", tone: "from-blush-50 to-gold-100" },
  { label: "Minimal Nail Art", tone: "from-gold-100 to-blush-100" },
  { label: "Spa Pedicure", tone: "from-blush-100 to-gold-50" },
  { label: "Seasonal Design", tone: "from-gold-50 to-blush-200" },
];

export function Gallery() {
  return (
    <section id="gallery" className="bg-blush-50/60 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <span className="section-eyebrow">Portfolio</span>
          <h2 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">Gallery</h2>
          <p className="mx-auto mt-3 max-w-xl text-blush-800/70">
            A glimpse of the artistry our technicians create every day.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3">
          {GALLERY_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className={`group relative aspect-square animate-fadeInUp overflow-hidden rounded-3xl bg-gradient-to-br ${item.tone} shadow-soft`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="absolute inset-0 flex items-end bg-black/0 p-4 transition group-hover:bg-black/10">
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blush-900 opacity-0 backdrop-blur transition group-hover:opacity-100">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

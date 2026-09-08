"use client";

import { useState } from "react";
import Link from "next/link";
import { COPY, type FeatureIcon, type Lang } from "@/lib/landing/copy";
import { PLANS, PLAN_ORDER } from "@/lib/billing/plans";

/** Demo tenant seeded by supabase/seed.sql — the "click around" salon. */
const DEMO_SLUG = "nail-bar";

const ICON_PATHS: Record<FeatureIcon, string> = {
  phone: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z",
  calendar: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  translate: "m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802",
  bell: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
  megaphone: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
};

function Icon({ name }: { name: FeatureIcon }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-blush-500" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.42.006l-3.5-3.45a1 1 0 1 1 1.404-1.424l2.79 2.75 6.79-6.882a1 1 0 0 1 1.43-.014Z" clipRule="evenodd" />
    </svg>
  );
}

export function Landing() {
  // Vietnamese first: the buyer is a Vietnamese salon owner.
  const [lang, setLang] = useState<Lang>("vi");
  const t = COPY[lang];

  return (
    <div className="min-h-screen bg-white text-blush-900">
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-20 border-b border-blush-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-serif text-xl font-semibold tracking-tight">Nail Bar Platform</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex rounded-full border border-blush-100 p-0.5 text-xs font-medium">
              {(["vi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`rounded-full px-2.5 py-1 transition ${lang === code ? "bg-blush-500 text-white" : "text-blush-800/60 hover:text-blush-800"}`}
                >
                  {code === "vi" ? "VI" : "EN"}
                </button>
              ))}
            </div>
            <Link href="/login" className="hidden px-3 py-2 text-sm font-medium text-blush-800/70 transition hover:text-blush-900 sm:block">
              {t.nav.login}
            </Link>
            <Link href="/signup" className="rounded-full bg-blush-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-blush-600">
              {t.nav.start}
            </Link>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blush-50 to-white">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          <span className="inline-flex rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-800">
            {t.hero.badge}
          </span>
          <h1 className="mt-6 font-serif text-4xl font-semibold leading-tight sm:text-6xl">
            {t.hero.title}{" "}
            <span className="text-blush-500">{t.hero.highlight}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-blush-800/70">{t.hero.sub}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="w-full rounded-full bg-blush-500 px-7 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-blush-600 sm:w-auto">
              {t.hero.cta}
            </Link>
            <Link href={`/s/${DEMO_SLUG}`} className="w-full rounded-full border border-blush-200 px-7 py-3.5 text-base font-semibold text-blush-800 transition hover:border-blush-300 hover:bg-blush-50 sm:w-auto">
              {t.hero.demo}
            </Link>
          </div>
          <p className="mt-4 text-sm text-blush-800/50">{t.hero.ctaSub}</p>
        </div>
      </section>

      {/* ------------------------------------------------------------- pains */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="text-center font-serif text-3xl font-semibold sm:text-4xl">{t.pains.title}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.pains.items.map((item) => (
            <div key={item.q} className="rounded-2xl border border-blush-100 bg-blush-50/50 p-6">
              <p className="font-serif text-lg font-semibold leading-snug">&ldquo;{item.q}&rdquo;</p>
              <p className="mt-3 text-sm leading-relaxed text-blush-800/70">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- features */}
      <section className="bg-blush-50/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{t.features.title}</h2>
            <p className="mt-3 text-blush-800/60">{t.features.sub}</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((f) => (
              <div key={f.name} className="rounded-2xl border border-blush-100 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blush-100 text-blush-600">
                  <Icon name={f.icon} />
                </div>
                <h3 className="mt-4 font-semibold">{f.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-blush-800/70">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- demo */}
      <section className="mx-auto max-w-4xl px-5 py-20">
        <div className="rounded-3xl border border-gold-200 bg-gold-50/60 p-8 text-center sm:p-12">
          <h2 className="font-serif text-3xl font-semibold">{t.demo.title}</h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-blush-800/70">{t.demo.body}</p>
          <Link href={`/s/${DEMO_SLUG}`} className="mt-8 inline-block rounded-full bg-blush-900 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-blush-800">
            {t.demo.cta}
          </Link>
          <p className="mt-3 text-sm text-blush-800/50">{t.demo.note}</p>
        </div>
      </section>

      {/* ----------------------------------------------------------- pricing */}
      <section id="pricing" className="bg-blush-50/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{t.pricing.title}</h2>
            <p className="mt-3 text-blush-800/60">{t.pricing.sub}</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const plan = PLANS[id];
              const copy = t.planCopy[id];
              const featured = id === "pro";
              return (
                <div
                  key={id}
                  className={`relative flex flex-col rounded-2xl border bg-white p-7 ${featured ? "border-blush-300 shadow-soft lg:-mt-3 lg:mb-3" : "border-blush-100 shadow-sm"}`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blush-500 px-3 py-1 text-xs font-semibold text-white">
                      {t.pricing.popular}
                    </span>
                  )}
                  <h3 className="font-serif text-2xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-blush-800/60">{copy.tagline}</p>
                  <p className="mt-5">
                    {plan.priceMonthlyUsd === 0 ? (
                      <span className="font-serif text-4xl font-semibold">{t.pricing.free}</span>
                    ) : (
                      <>
                        <span className="font-serif text-4xl font-semibold">${plan.priceMonthlyUsd}</span>
                        <span className="text-blush-800/60">{t.pricing.month}</span>
                      </>
                    )}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {copy.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-blush-800/80">
                        <Check />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-7 rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                      featured ? "bg-blush-500 text-white hover:bg-blush-600" : "border border-blush-200 text-blush-800 hover:bg-blush-50"
                    }`}
                  >
                    {plan.priceMonthlyUsd === 0 ? t.pricing.ctaFree : t.pricing.cta}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-blush-800/50">{t.pricing.note}</p>
        </div>
      </section>

      {/* --------------------------------------------------------------- faq */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-center font-serif text-3xl font-semibold sm:text-4xl">{t.faq.title}</h2>
        <dl className="mt-10 divide-y divide-blush-100">
          {t.faq.items.map((item) => (
            <div key={item.q} className="py-6">
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-blush-800/70">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --------------------------------------------------------------- cta */}
      <section className="bg-blush-900 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{t.cta.title}</h2>
          <p className="mt-4 text-blush-100/80">{t.cta.sub}</p>
          <Link href="/signup" className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-base font-semibold text-blush-900 transition hover:bg-blush-50">
            {t.cta.button}
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-blush-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-blush-800/50 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Nail Bar Platform · {t.footer}</span>
          <Link href="/login" className="transition hover:text-blush-800">{t.nav.login}</Link>
        </div>
      </footer>
    </div>
  );
}

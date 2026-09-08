"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { submitLeadAction, type LeadState } from "@/actions/leads";
import { VSL } from "@/lib/landing/vsl-copy";

const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"] as const;

const initial: LeadState = {};

export function LeadForm() {
  const [state, action, pending] = useActionState(submitLeadAction, initial);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  // Read the ad parameters on the client: the page is statically rendered, so
  // the server never sees the query string.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const key of TRACKING_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value;
    }
    setTracking(found);
  }, []);

  if (state.done) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-8 text-center">
        <p className="font-serif text-2xl font-semibold text-amber-300">{VSL.successTitle}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">{VSL.successBody}</p>
        <Link
          href="/s/nail-bar"
          className="mt-6 inline-block rounded-full border border-amber-400/60 px-6 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/10"
        >
          {VSL.successCta}
        </Link>
      </div>
    );
  }

  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4 text-left">
      {Object.entries(tracking).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <Field label={VSL.fields.name} name="full_name" placeholder={VSL.fields.namePh} error={fe.full_name} required autoComplete="name" />
      <Field label={VSL.fields.phone} name="phone" placeholder={VSL.fields.phonePh} error={fe.phone} required type="tel" autoComplete="tel" inputMode="tel" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={VSL.fields.salon} name="salon_name" placeholder={VSL.fields.salonPh} error={fe.salon_name} />
        <Field label={VSL.fields.city} name="city" placeholder={VSL.fields.cityPh} error={fe.city} />
      </div>

      {state.error && <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-4 text-base font-bold tracking-wide text-neutral-950 shadow-[0_0_40px_-8px_rgba(251,191,36,0.7)] transition hover:brightness-105 disabled:opacity-60"
      >
        {pending ? VSL.submitting : VSL.submit}
      </button>
      <p className="text-center text-xs text-white/40">{VSL.privacy}</p>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  ...props
}: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/70">{label}</span>
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-white placeholder-white/25 outline-none transition focus:border-amber-400/70 focus:bg-white/10 ${
          error ? "border-red-400/60" : "border-white/15"
        }`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-300">{error}</span>}
    </label>
  );
}

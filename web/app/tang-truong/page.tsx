import type { Metadata } from "next";
import Script from "next/script";
import { LeadForm } from "@/components/landing/LeadForm";
import { VSL, VSL_VIDEO_POSTER, VSL_VIDEO_URL } from "@/lib/landing/vsl-copy";

export const metadata: Metadata = {
  title: "Lễ tân AI cho tiệm nail — đăng ký xem demo miễn phí",
  description: VSL.sub,
  // An ad destination has no business in search results competing with the
  // real marketing site, and Google penalises thin pages like this one.
  robots: { index: false, follow: false },
};

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

/**
 * Ad landing page (VSL funnel) — the destination for Facebook ads.
 *
 * Deliberately unlike the marketing site at `/`: no navigation, no pricing, no
 * outbound links above the form. Cold paid traffic gets one message, one video
 * and one thing to do, because every other clickable thing is a way to leave.
 */
export default function VslPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {PIXEL_ID && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}

      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {/* ------------------------------------------------------------ hook */}
        <h1 className="text-center font-serif text-3xl font-semibold leading-tight text-amber-300 sm:text-4xl">
          {VSL.headline}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-relaxed text-white/75">{VSL.sub}</p>

        {/* --------------------------------------------------------- step 1 */}
        <div className="mt-10 text-center">
          <span className="inline-flex rounded-full border border-amber-400/50 px-4 py-1.5 text-sm font-semibold text-amber-300">
            {VSL.step1Badge}
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-amber-400/25 bg-black shadow-[0_0_60px_-20px_rgba(251,191,36,0.5)]">
          {VSL_VIDEO_URL ? (
            isEmbed(VSL_VIDEO_URL) ? (
              <div className="aspect-video">
                <iframe
                  src={VSL_VIDEO_URL}
                  title={VSL.videoCaption}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <video controls playsInline preload="metadata" poster={VSL_VIDEO_POSTER || undefined} className="aspect-video w-full">
                <source src={VSL_VIDEO_URL} />
              </video>
            )
          ) : (
            <div className="flex aspect-video items-center justify-center p-8">
              <p className="max-w-sm text-center text-sm leading-relaxed text-white/50">{VSL.videoPlaceholder}</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-sm text-white/50">{VSL.videoCaption}</p>

        {/* ---------------------------------------------------------- proof */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {VSL.proof.map((p) => (
            <div key={p.stat} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="font-serif text-2xl font-semibold text-amber-300">{p.stat}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{p.label}</p>
            </div>
          ))}
        </div>

        {/* --------------------------------------------------------- step 2 */}
        <div className="mt-14 text-center">
          <span className="inline-flex rounded-full border border-amber-400/50 px-4 py-1.5 text-sm font-semibold text-amber-300">
            {VSL.step2Badge}
          </span>
          <h2 className="mt-5 font-serif text-2xl font-semibold sm:text-3xl">{VSL.formTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60">{VSL.formSub}</p>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <LeadForm />
        </div>

        {/* ------------------------------------------------------------ faq */}
        <h2 className="mt-16 text-center font-serif text-2xl font-semibold">{VSL.faqTitle}</h2>
        <dl className="mt-6 divide-y divide-white/10">
          {VSL.faq.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-semibold text-white/90">{item.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-white/60">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** YouTube, Vimeo and friends need an iframe; a bare file needs <video>. */
function isEmbed(url: string): boolean {
  return /youtube|youtu\.be|vimeo|wistia|loom/i.test(url);
}

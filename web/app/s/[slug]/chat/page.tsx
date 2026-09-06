import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSalon } from "@/lib/storefront";
import { ChatWidget } from "@/components/chat/ChatWidget";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Embed page: drop this URL in an <iframe> on any website. Everything except
 * the chat button/panel is transparent and click-through, so the host page
 * stays fully usable. Port of client/src/pages/EmbedChatPage.tsx.
 */
export default async function EmbedChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getPublicSalon(slug);
  if (!salon || !salon.ai_enabled) notFound();

  return (
    <div className="pointer-events-none fixed inset-0 bg-transparent">
      <style>{`html, body { background: transparent !important; }`}</style>
      <ChatWidget
        slug={slug}
        salonName={salon.name}
        salonPhone={salon.phone}
        greeting={salon.ai_greeting}
        channel="embed"
        bookingHref={salon.online_booking_enabled ? `/s/${slug}/book` : undefined}
      />
    </div>
  );
}

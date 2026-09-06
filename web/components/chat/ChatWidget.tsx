"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  slug: string;
  salonName: string;
  salonPhone?: string | null;
  greeting?: string | null;
  channel?: "web" | "embed";
  /** Start open (used by the iframe embed page). */
  defaultOpen?: boolean;
  quickPrompts?: string[];
  bookingHref?: string;
}

const DEFAULT_PROMPTS = ["What services do you offer?", "Are you open today?", "Where are you located?", "Book an appointment"];

function storageKey(slug: string, kind: "session" | "history") {
  return `nailbar:${slug}:chat:${kind}`;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

/**
 * Port of client/src/components/chat/ChatWidget.tsx. Talks to /api/chat with a
 * per-salon session id kept in localStorage, so the conversation survives
 * reloads and the salon sees one thread per visitor in the inbox.
 */
export function ChatWidget({
  slug,
  salonName,
  salonPhone,
  greeting,
  channel = "web",
  defaultOpen = false,
  quickPrompts = DEFAULT_PROMPTS,
  bookingHref,
}: Props) {
  const welcome = useMemo<UiMessage>(
    () => ({
      id: "welcome",
      role: "assistant",
      content:
        greeting ??
        `Hi there! I'm the ${salonName} virtual receptionist. Ask me about services, pricing, hours, or I can help you book an appointment.`,
    }),
    [greeting, salonName]
  );

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<UiMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [needsHuman, setNeedsHuman] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const sessionRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      let sid = localStorage.getItem(storageKey(slug, "session"));
      if (!sid) {
        sid = newId();
        localStorage.setItem(storageKey(slug, "session"), sid);
      }
      sessionRef.current = sid;
      const stored = localStorage.getItem(storageKey(slug, "history"));
      if (stored) {
        const parsed = JSON.parse(stored) as UiMessage[];
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {
      sessionRef.current = sessionRef.current || newId();
    }
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey(slug, "history"), JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage unavailable */
    }
  }, [messages, hydrated, slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, isOpen]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;
      setMessages((prev) => [...prev, { id: newId(), role: "user", content: trimmed }]);
      setIsSending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, sessionId: sessionRef.current, message: trimmed, channel }),
        });
        const body = (await res.json().catch(() => ({}))) as { reply?: string; needsHuman?: boolean; error?: string };
        if (!res.ok || !body.reply) throw new Error(body.error ?? "Request failed");
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: body.reply! }]);
        setNeedsHuman(!!body.needsHuman);
      } catch (err) {
        const msg = err instanceof Error && err.message !== "Request failed" ? err.message : null;
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: msg ?? `Sorry, I'm having trouble connecting right now. Please call us${salonPhone ? ` at ${salonPhone}` : ""} or try again in a moment.`,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [channel, isSending, salonPhone, slug]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input;
    setInput("");
    void send(text);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI chat"
        className="pointer-events-auto fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blush-500 to-blush-600 text-white shadow-soft transition hover:scale-105 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute -right-1 -top-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-gold-500" />
        </span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={`${salonName} AI receptionist`}
      className="pointer-events-auto fixed inset-x-4 bottom-4 z-50 mx-auto flex h-[min(640px,85vh)] max-w-sm flex-col overflow-hidden rounded-3xl border border-blush-100 bg-white shadow-2xl sm:bottom-6 sm:left-auto sm:right-6"
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-blush-500 to-blush-600 px-5 py-4 text-white">
        <div>
          <p className="font-serif text-lg font-semibold">{salonName}</p>
          <p className="text-xs text-white/80">AI Receptionist · Usually replies instantly</p>
        </div>
        <button onClick={() => setIsOpen(false)} aria-label="Close chat" className="rounded-full p-1.5 transition hover:bg-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <path d="M6 18 18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-blush-50/40 px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                m.role === "user" ? "rounded-br-sm bg-blush-500 text-white" : "rounded-bl-sm border border-blush-100 bg-white text-blush-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start" aria-live="polite">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-blush-100 bg-white px-4 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blush-300 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blush-300 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blush-300" />
            </div>
          </div>
        )}
        {needsHuman && (
          <div className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs text-gold-700">
            We&apos;re connecting you with our front desk team.
            {salonPhone && <> Feel free to call us directly at {salonPhone} for immediate help.</>}
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-blush-100 bg-white px-4 py-3">
          {quickPrompts.map((p) => (
            <button key={p} onClick={() => void send(p)} className="rounded-full border border-blush-200 px-3 py-1.5 text-xs text-blush-700 transition hover:bg-blush-50">
              {p}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-blush-100 bg-white p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          aria-label="Message"
          className="input-field flex-1"
          disabled={isSending}
          maxLength={2000}
        />
        <button type="submit" disabled={isSending || !input.trim()} className="btn-primary !px-4 !py-3" aria-label="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      {bookingHref && (
        <div className="border-t border-blush-100 bg-white px-4 py-2 text-center">
          <Link href={bookingHref} className="text-xs font-medium text-blush-500 hover:underline">
            Prefer to book directly? Go to booking page →
          </Link>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { ChatMessageBubble } from "./ChatMessage";

const QUICK_PROMPTS = [
  "How much is Gel X?",
  "Are you open today?",
  "Where are you located?",
  "Do you accept walk-ins?",
];

export function ChatWidget() {
  const { isOpen, close, messages, sendMessage, isSending, needsHuman } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    void sendMessage(input);
    setInput("");
  }

  return (
    <div className="pointer-events-auto fixed inset-x-4 bottom-4 z-50 mx-auto flex h-[min(640px,80vh)] max-w-sm flex-col overflow-hidden rounded-3xl border border-blush-100 bg-white shadow-2xl sm:right-6 sm:left-auto sm:bottom-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-blush-500 to-blush-600 px-5 py-4 text-white">
        <div>
          <p className="font-serif text-lg font-semibold">Nail Bar</p>
          <p className="text-xs text-white/80">AI Receptionist · Usually replies instantly</p>
        </div>
        <button
          onClick={close}
          aria-label="Close chat"
          className="rounded-full p-1.5 transition hover:bg-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M6 18 18 6M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-blush-50/40 px-4 py-4">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-blush-100 bg-white px-4 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blush-300 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blush-300 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blush-300" />
            </div>
          </div>
        )}

        {needsHuman && (
          <div className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs text-gold-700">
            We're connecting you with our front desk team. Feel free to call us directly at
            (317) 555-0182 for immediate help.
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-blush-100 bg-white px-4 py-3">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              className="rounded-full border border-blush-200 px-3 py-1.5 text-xs text-blush-700 transition hover:bg-blush-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-blush-100 bg-white p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="input-field flex-1"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="btn-primary !px-4 !py-3"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

      <div className="border-t border-blush-100 bg-white px-4 py-2 text-center">
        <Link to="/booking" className="text-xs font-medium text-blush-500 hover:underline">
          Prefer to book directly? Go to booking page →
        </Link>
      </div>
    </div>
  );
}

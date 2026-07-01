import { useChat } from "../../context/ChatContext";

export function ChatButton() {
  const { toggle, isOpen } = useChat();

  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      aria-label="Open AI chat"
      className="pointer-events-auto fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blush-500 to-blush-600 text-white shadow-soft transition hover:scale-105 active:scale-95"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-7 w-7">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute -top-1 -right-1 flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
        <span className="relative inline-flex h-4 w-4 rounded-full bg-gold-500" />
      </span>
    </button>
  );
}

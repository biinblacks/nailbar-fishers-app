import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { chatApi } from "../lib/api";

export interface ChatUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ChatUiMessage[];
  sendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  needsHuman: boolean;
}

const SESSION_STORAGE_KEY = "nailbar_chat_session_id";
const HISTORY_STORAGE_KEY = "nailbar_chat_history";

function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}

const WELCOME_MESSAGE: ChatUiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! I'm the Luxe Nail Bar virtual receptionist. Ask me about services, pricing, hours, or I can help you book an appointment.",
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatUiMessage[]>(() => {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ChatUiMessage[];
      } catch {
        return [WELCOME_MESSAGE];
      }
    }
    return [WELCOME_MESSAGE];
  });
  const [isSending, setIsSending] = useState(false);
  const [needsHuman, setNeedsHuman] = useState(false);
  const sessionId = useMemo(getOrCreateSessionId, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMessage: ChatUiMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const { reply, needsHuman: handoff } = await chatApi.sendMessage(sessionId, trimmed);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: reply },
        ]);
        setNeedsHuman(handoff);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Sorry, I'm having trouble connecting right now. Please call us or try again in a moment.",
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, sessionId]
  );

  const value: ChatContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    messages,
    sendMessage,
    isSending,
    needsHuman,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}

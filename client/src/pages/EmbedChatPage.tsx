import { useEffect } from "react";
import { ChatButton } from "../components/chat/ChatButton";
import { ChatWidget } from "../components/chat/ChatWidget";

// Rendered inside an <iframe> embedded on an external site (e.g. Lovable).
// The iframe covers the full viewport with a transparent, click-through
// background so only the chat button/panel themselves are interactive —
// the host page remains fully usable everywhere else.
export function EmbedChatPage() {
  useEffect(() => {
    document.documentElement.classList.add("embed-transparent");
    document.body.classList.add("embed-transparent");
    return () => {
      document.documentElement.classList.remove("embed-transparent");
      document.body.classList.remove("embed-transparent");
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0">
      <ChatButton />
      <ChatWidget />
    </div>
  );
}

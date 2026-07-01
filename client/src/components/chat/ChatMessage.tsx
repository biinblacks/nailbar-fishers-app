import type { ChatUiMessage } from "../../context/ChatContext";

export function ChatMessageBubble({ message }: { message: ChatUiMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isUser
            ? "rounded-br-sm bg-blush-500 text-white"
            : "rounded-bl-sm border border-blush-100 bg-white text-blush-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

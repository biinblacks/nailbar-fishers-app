import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi } from "../../lib/api";
import type { ChatConversation, ChatMessage } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export function MessagesAdmin() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    adminApi
      .listConversations()
      .then(setConversations)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    adminApi
      .getConversationMessages(selectedId)
      .then(setMessages)
      .finally(() => setLoadingMessages(false));
  }, [selectedId]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-blush-900">Customer Messages</h1>
      <p className="mt-1 text-sm text-blush-800/70">
        Review AI chat conversations. Conversations flagged "needs human" may require follow-up.
      </p>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <h2 className="font-serif text-lg font-semibold text-blush-900">Conversations</h2>
            <ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      selectedId === c.id ? "bg-blush-500 text-white" : "hover:bg-blush-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{c.customer_name ?? "Anonymous Guest"}</span>
                      {c.needs_human && (
                        <span className="rounded-full bg-gold-400 px-1.5 py-0.5 text-[10px] text-white">
                          !
                        </span>
                      )}
                    </div>
                    <span className="block text-xs opacity-70">
                      {new Date(c.updated_at).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
              {conversations.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-blush-800/50">No conversations yet.</p>
              )}
            </ul>
          </Card>

          <Card className="md:col-span-2">
            <h2 className="font-serif text-lg font-semibold text-blush-900">Transcript</h2>
            {!selectedId && (
              <p className="mt-4 text-sm text-blush-800/50">Select a conversation to view messages.</p>
            )}
            {loadingMessages && (
              <div className="mt-6 flex justify-center">
                <LoadingSpinner />
              </div>
            )}
            {!loadingMessages && selectedId && (
              <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      m.role === "user"
                        ? "ml-auto bg-blush-500 text-white"
                        : "bg-blush-50 text-blush-900"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { listConnectedPagesAction, switchMetaPageAction } from "@/actions/marketing";
import { initialActionState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ConnectWithFacebookButton({ slug, configured, label = "Connect with Facebook" }: { slug: string; configured: boolean; label?: string }) {
  if (!configured) {
    return <p className="text-xs text-blush-800/60">One-click Facebook login is not set up on this deployment. Paste a Page token below instead.</p>;
  }
  return (
    <a href={`/api/integrations/meta/start?slug=${encodeURIComponent(slug)}`} className="btn-primary w-full">
      {label}
    </a>
  );
}

/** Lets an owner move posting to a different Page on the same Facebook login. */
export function PageSwitcher({ slug, currentId }: { slug: string; currentId: string }) {
  const [state, action] = useActionState(switchMetaPageAction, initialActionState);
  const [pages, setPages] = useState<Array<{ id: string; name: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  if (!pages) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            startLoading(async () => {
              const result = await listConnectedPagesAction(slug);
              if ("error" in result) setError(result.error);
              else setPages(result);
            })
          }
          className="text-xs font-medium text-blush-500 hover:underline disabled:opacity-60"
        >
          {loading ? "Loading Pages…" : "Switch Page"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <select name="page_id" defaultValue={currentId} aria-label="Facebook Page" className="input-field !py-1.5 text-xs">
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" className="!px-3 !py-1 text-xs">
        Use this Page
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { connectMetaAction, regenerateCampaignAction, schedulePostAction, updateAssetAction } from "@/actions/marketing";
import { initialActionState } from "@/lib/action-state";
import { Input, Select } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function RegenerateForm({ slug, id }: { slug: string; id: string }) {
  const [state, action] = useActionState(regenerateCampaignAction, initialActionState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary" pendingText="Generating…">
        Regenerate
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="text-xs font-medium text-blush-500 hover:underline"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function EditableAsset({ slug, id, content }: { slug: string; id: string; content: string }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <>
        <p className="whitespace-pre-wrap text-sm text-blush-900">{content}</p>
        <button type="button" onClick={() => setEditing(true)} className="mt-1 text-xs font-medium text-blush-500 hover:underline">
          Edit
        </button>
      </>
    );
  }
  return (
    <form action={updateAssetAction} onSubmit={() => setEditing(false)} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <textarea name="content" defaultValue={content} className="input-field min-h-[120px]" maxLength={4000} />
      <div className="flex gap-2">
        <button type="submit" className="btn-secondary !px-3 !py-1 text-xs">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-blush-500 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}

interface ScheduleProps {
  slug: string;
  campaignId?: string;
  assets: Array<{ id: string; kind: string; language: string; content: string }>;
  metaConnected: boolean;
  defaultDate: string;
}

export function SchedulePostForm({ slug, campaignId, assets, metaConnected, defaultDate }: ScheduleProps) {
  const [state, action] = useActionState(schedulePostAction, initialActionState);
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [content, setContent] = useState(assets[0]?.content ?? "");
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      {campaignId && <input type="hidden" name="campaign_id" value={campaignId} />}
      <input type="hidden" name="asset_id" value={assetId} />
      <div className="grid gap-3 sm:grid-cols-2">
        {assets.length > 0 && (
          <Select
            label="Start from"
            name="_asset"
            value={assetId}
            onChange={(e) => {
              setAssetId(e.target.value);
              setContent(assets.find((a) => a.id === e.target.value)?.content ?? "");
            }}
            wrapperClassName="sm:col-span-2"
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.kind} · {a.language} · {a.content.slice(0, 60)}
              </option>
            ))}
          </Select>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-blush-800 sm:col-span-2">
          Post text
          <textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} className="input-field min-h-[120px]" maxLength={4000} required />
          {fe.content && <span className="text-xs text-red-500">{fe.content}</span>}
        </label>
        <Select label="Platform" name="platform" defaultValue="facebook" error={fe.platform}>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="other">Other</option>
        </Select>
        <Select label="Publishing" name="publish_mode" defaultValue={metaConnected ? "auto" : "manual"} hint={metaConnected ? "Auto posts through your connected Page" : "Connect a Facebook Page to auto-publish"}>
          <option value="manual">Manual — remind me when it&apos;s time</option>
          <option value="auto" disabled={!metaConnected}>
            Auto — publish through Facebook/Instagram
          </option>
        </Select>
        <Input label="Date" name="date" type="date" defaultValue={defaultDate} required error={fe.date} />
        <Input label="Time" name="time" type="time" defaultValue="10:00" required error={fe.time} />
        <Input label="Image URL (required for Instagram)" name="image_url" type="url" placeholder="https://…" wrapperClassName="sm:col-span-2" error={fe.image_url} />
        <Input label="Link (optional)" name="link_url" type="url" placeholder="https://…" wrapperClassName="sm:col-span-2" error={fe.link_url} />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Schedule post</SubmitButton>
    </form>
  );
}

export function MetaConnectForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(connectMetaAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Facebook Page ID" name="external_id" required error={fe.external_id} />
        <Input label="Page name (optional)" name="display_name" error={fe.display_name} />
        <Input label="Page access token" name="access_token" type="password" required wrapperClassName="sm:col-span-2" hint="Long-lived Page token with pages_manage_posts (and instagram_content_publish for IG)" error={fe.access_token} />
        <Input label="Instagram business account ID (optional)" name="instagram_account_id" wrapperClassName="sm:col-span-2" error={fe.instagram_account_id} />
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Connect</SubmitButton>
    </form>
  );
}

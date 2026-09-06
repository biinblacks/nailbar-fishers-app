import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Db = SupabaseClient<Database>;
const GRAPH = "https://graph.facebook.com/v21.0";

interface MetaIntegration {
  external_id: string;
  access_token: string;
  instagram_account_id: string | null;
}

async function graph(path: string, params: Record<string, string>): Promise<{ id?: string; error?: { message: string } }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  return (await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))) as { id?: string; error?: { message: string } };
}

/** Facebook Page: text post, link post, or photo post. */
export async function publishToFacebook(meta: MetaIntegration, content: string, imageUrl: string | null, linkUrl: string | null): Promise<string> {
  const result = imageUrl
    ? await graph(`${meta.external_id}/photos`, { url: imageUrl, caption: content, access_token: meta.access_token })
    : await graph(`${meta.external_id}/feed`, { message: content, ...(linkUrl ? { link: linkUrl } : {}), access_token: meta.access_token });
  if (result.error || !result.id) throw new Error(result.error?.message ?? "Facebook publish failed");
  return result.id;
}

/** Instagram Business: image container → publish (Instagram requires an image). */
export async function publishToInstagram(meta: MetaIntegration, content: string, imageUrl: string | null): Promise<string> {
  if (!meta.instagram_account_id) throw new Error("No Instagram business account is linked to the connected Page.");
  if (!imageUrl) throw new Error("Instagram posts need an image. Add an image URL to the post.");
  const container = await graph(`${meta.instagram_account_id}/media`, { image_url: imageUrl, caption: content, access_token: meta.access_token });
  if (container.error || !container.id) throw new Error(container.error?.message ?? "Instagram container failed");
  const published = await graph(`${meta.instagram_account_id}/media_publish`, { creation_id: container.id, access_token: meta.access_token });
  if (published.error || !published.id) throw new Error(published.error?.message ?? "Instagram publish failed");
  return published.id;
}

export interface PublishSummary {
  published: number;
  ready: number;
  failed: number;
}

/**
 * Cron worker: auto posts go out through the connected Meta Page; manual
 * posts flip to "ready" so staff see them at the top of the Marketing page.
 */
export async function publishDuePosts(db: Db, now: Date): Promise<PublishSummary> {
  const summary: PublishSummary = { published: 0, ready: 0, failed: 0 };
  const { data: posts, error } = await db
    .from("scheduled_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now.toISOString())
    .lt("attempts", 3)
    .order("scheduled_for")
    .limit(50);
  if (error) throw new Error(`load posts failed: ${error.message}`);

  for (const post of posts ?? []) {
    if (post.publish_mode === "manual" || post.platform === "tiktok" || post.platform === "other") {
      await db.from("scheduled_posts").update({ status: "ready" }).eq("id", post.id);
      summary.ready++;
      continue;
    }

    const { data: meta } = await db
      .from("salon_integrations")
      .select("external_id, access_token, instagram_account_id")
      .eq("salon_id", post.salon_id)
      .eq("provider", "meta")
      .maybeSingle();

    try {
      if (!meta) throw new Error("No Facebook Page is connected for this salon.");
      const externalId =
        post.platform === "facebook"
          ? await publishToFacebook(meta, post.content, post.image_url, post.link_url)
          : await publishToInstagram(meta, post.content, post.image_url);
      await db
        .from("scheduled_posts")
        .update({ status: "published", external_id: externalId, published_at: new Date().toISOString(), attempts: post.attempts + 1, error: null })
        .eq("id", post.id);
      summary.published++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "publish failed";
      const attempts = post.attempts + 1;
      await db
        .from("scheduled_posts")
        .update({ status: attempts >= 3 ? "failed" : "scheduled", attempts, error: message })
        .eq("id", post.id);
      summary.failed++;
    }
  }
  return summary;
}

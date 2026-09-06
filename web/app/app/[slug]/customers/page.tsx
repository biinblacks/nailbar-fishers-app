import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import type { Customer } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { q = "", page = "1" } = await searchParams;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const pageNum = Math.max(1, Number(page) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("salon_id", salon.id)
    .order("full_name")
    .range(from, from + PAGE_SIZE - 1);

  const term = q.trim();
  if (term) {
    const like = `%${term.replace(/[%_]/g, "")}%`;
    query = query.or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`);
  }

  const { data, count } = await query;
  const customers = (data ?? []) as Customer[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Customers"
        description="Everyone who has booked with you. Notes and tags help personalize every visit."
        actions={<LinkButton href={`/app/${slug}/customers/new`}>Add customer</LinkButton>}
      />

      <form className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, phone, or email"
          aria-label="Search customers"
          className="input-field max-w-md"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
        {term && (
          <Link href={`/app/${slug}/customers`} className="btn-secondary">
            Clear
          </Link>
        )}
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title={term ? "No customers match that search" : "No customers yet"}
          description={
            term
              ? "Try a different name or phone number."
              : "Customers are added automatically when they book, or you can add them by hand."
          }
          action={!term ? <LinkButton href={`/app/${slug}/customers/new`}>Add a customer</LinkButton> : undefined}
        />
      ) : (
        <>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Tags</th>
                  <th>Last visit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/app/${slug}/customers/${c.id}`} className="font-medium text-blush-900 hover:underline">
                        {c.full_name}
                      </Link>
                      {c.preferred_language === "vi" && (
                        <span className="ml-2 text-xs text-blush-800/50">Tiếng Việt</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{c.phone}</td>
                    <td className="max-w-[200px] truncate">{c.email ?? "—"}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.slice(0, 3).map((t) => (
                          <Badge key={t} className="border-blush-100 bg-blush-50 text-blush-600">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-blush-800/70">
                      {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString("en-US") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
              <span className="text-blush-800/60">
                Page {pageNum} of {totalPages} · {total} customers
              </span>
              <div className="flex gap-2">
                {pageNum > 1 && (
                  <Link href={`/app/${slug}/customers?q=${encodeURIComponent(q)}&page=${pageNum - 1}`} className="btn-secondary">
                    Previous
                  </Link>
                )}
                {pageNum < totalPages && (
                  <Link href={`/app/${slug}/customers?q=${encodeURIComponent(q)}&page=${pageNum + 1}`} className="btn-secondary">
                    Next
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

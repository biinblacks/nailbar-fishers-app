import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import type { Staff } from "@/lib/types";
import { toggleStaffAction } from "@/actions/staff";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("salon_id", salon.id)
    .order("display_order")
    .order("full_name");
  const staff = (data ?? []) as Staff[];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Team"
        title="Nail technicians"
        description="Technicians can be assigned to appointments. Inactive technicians are hidden from booking."
        actions={<LinkButton href={`/app/${slug}/staff/new`}>Add technician</LinkButton>}
      />

      {staff.length === 0 ? (
        <EmptyState
          title="No technicians yet"
          description="Add your team so you can assign appointments and avoid double-booking."
          action={<LinkButton href={`/app/${slug}/staff/new`}>Add your first technician</LinkButton>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <div key={member.id} className="glass-card flex flex-col p-5">
              <div className="flex items-center gap-3">
                <Avatar name={member.full_name} color={member.color} src={member.photo_url} />
                <div className="min-w-0">
                  <Link href={`/app/${slug}/staff/${member.id}`} className="block truncate font-semibold text-blush-900 hover:underline">
                    {member.full_name}
                  </Link>
                  <p className="truncate text-xs uppercase tracking-wide text-gold-500">{member.title ?? "Nail Technician"}</p>
                </div>
              </div>
              {member.bio && <p className="mt-3 line-clamp-3 text-sm text-blush-800/70">{member.bio}</p>}
              <div className="mt-4 flex items-center justify-between">
                <Badge className={member.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-100 text-gray-600"}>
                  {member.is_active ? "Active" : "Inactive"}
                </Badge>
                <div className="flex gap-3">
                  <form action={toggleStaffAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="id" value={member.id} />
                    <input type="hidden" name="is_active" value={member.is_active ? "false" : "true"} />
                    <button type="submit" className="text-xs font-medium text-blush-500 hover:underline">
                      {member.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <Link href={`/app/${slug}/staff/${member.id}`} className="text-xs font-medium text-blush-500 hover:underline">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

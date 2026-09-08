import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/salon";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Lễ tân AI cho tiệm nail · Nail Bar Platform",
  description:
    "Lễ tân AI nghe điện thoại và nhắn tin, đặt lịch online, phiên dịch Việt–Anh tại ghế, nhắc khách quay lại và viết nội dung marketing. Dùng thử miễn phí.",
  openGraph: {
    title: "Lễ tân AI cho tiệm nail · Nail Bar Platform",
    description: "Một phần mềm thay cho cả người trực quầy. Dùng thử miễn phí, không cần thẻ.",
    type: "website",
  },
};

export default async function RootPage() {
  // Owners who are already signed in want the dashboard, not the sales pitch.
  const user = await getCurrentUser();
  if (user) redirect("/app");
  return <Landing />;
}

import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-center text-2xl font-bold text-blush-900">Welcome back</h1>
      <p className="mt-1 text-center text-sm text-blush-800/70">Sign in to manage your salon.</p>
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-blush-800/70">
        New here?{" "}
        <Link href="/signup" className="font-medium text-blush-500 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

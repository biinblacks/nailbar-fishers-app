import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/forms/SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-center text-2xl font-bold text-blush-900">Create your account</h1>
      <p className="mt-1 text-center text-sm text-blush-800/70">
        Set up your salon in under two minutes.
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-blush-800/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blush-500 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

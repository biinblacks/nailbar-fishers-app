import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-center text-2xl font-bold text-blush-900">Reset your password</h1>
      <p className="mt-1 text-center text-sm text-blush-800/70">
        We&apos;ll email you a link to choose a new password.
      </p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-blush-800/70">
        <Link href="/login" className="font-medium text-blush-500 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-serif text-3xl font-bold text-blush-600">
          Nail <span className="text-gold-500">Bar</span>
        </Link>
        <div className="glass-card mt-6 p-8">{children}</div>
      </div>
    </main>
  );
}

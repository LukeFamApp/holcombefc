import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-white/10 px-6">
        <nav className="mx-auto flex max-w-6xl gap-1 font-(family-name:--font-ui-mono) text-sm">
          <Link
            href="/admin"
            className="px-4 py-3 text-white/70 hover:text-white transition-colors"
          >
            Registrations
          </Link>
          <Link
            href="/admin/teams"
            className="px-4 py-3 text-white/70 hover:text-white transition-colors"
          >
            Teams &amp; Fees
          </Link>
          <Link
            href="/admin/payments"
            className="px-4 py-3 text-white/70 hover:text-white transition-colors"
          >
            Payments
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}

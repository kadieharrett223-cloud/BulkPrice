import Link from "next/link";
import { ReactNode } from "react";

interface PublicResourceLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

const resourceLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/faq", label: "FAQ" },
  { href: "/tutorial", label: "Tutorial" },
  { href: "/docs", label: "Documentation" },
  { href: "/pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
];

export default function PublicResourceLayout({
  title,
  description,
  children,
}: PublicResourceLayoutProps) {
  return (
    <div className="min-h-screen px-6 py-10">
      <div className="w-full max-w-[1100px] mx-auto dashboard-wrapper space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              BulkPrice Resources
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{title}</h1>
            <p className="mt-3 max-w-3xl body-compact text-gray-600">{description}</p>
          </div>

          <Link href="/" className="btn-primary text-sm whitespace-nowrap self-start">
            Open App Demo
          </Link>
        </div>

        <nav className="section-card p-4">
          <div className="flex flex-wrap gap-2">
            {resourceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <article className="section-card p-8 space-y-6 text-gray-700 leading-7">{children}</article>
      </div>
    </div>
  );
}
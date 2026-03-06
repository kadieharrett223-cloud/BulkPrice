import Link from "next/link";
import { useRouter } from "next/router";
import { BarChart3, DollarSign, Clock, FileText, ChevronDown } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function Navigation() {
  const router = useRouter();

  const links = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/bulk-pricing", label: "Bulk Pricing", icon: DollarSign },
    { href: "/scheduled", label: "Scheduled", icon: Clock },
    { href: "/history", label: "History", icon: FileText },
  ];

  return (
    <header className="bg-white border-b border-blue-100 sticky top-0 z-50">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <BrandLogo />

          <nav className="hidden md:flex items-center gap-2 text-sm">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = router.pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
                    isActive
                      ? "text-blue-700 font-medium border-blue-600"
                      : "text-gray-600 border-transparent hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-medium">
            pri
          </span>
          <button className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white text-sm px-3 py-1.5 rounded-md border border-amber-300/60">
            Upgrade
          </button>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </header>
  );
}

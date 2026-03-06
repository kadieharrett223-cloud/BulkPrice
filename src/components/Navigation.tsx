import Link from "next/link";
import { useRouter } from "next/router";
import { Package, DollarSign, Clock, BarChart3, Settings, FileText } from "lucide-react";

export default function Navigation() {
  const router = useRouter();

  const links = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/bulk-pricing", label: "Bulk Pricing", icon: DollarSign },
    { href: "/scheduled", label: "Scheduled", icon: Clock },
    { href: "/history", label: "History", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-shopify text-white rounded-lg p-2">
              <Package className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg text-gray-900">Bulk Price Editor</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  router.pathname === href
                    ? "bg-shopify text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <a href="/" className="text-gray-700 hover:text-gray-900">
              Menu
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

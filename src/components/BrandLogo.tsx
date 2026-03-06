import Link from "next/link";
import { Plane } from "lucide-react";

interface BrandLogoProps {
  href?: string;
  compact?: boolean;
  className?: string;
}

export default function BrandLogo({ href = "/", compact = false, className = "" }: BrandLogoProps) {
  const content = (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-blue-700 border-2 border-amber-400 shadow-sm flex items-center justify-center">
          <Plane className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-white" />
      </div>

      {!compact && (
        <div className="leading-tight">
          <p className="text-xl font-semibold text-blue-900 italic tracking-tight">
            PricePilot <span className="text-amber-500 not-italic">Pro</span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}

import React from "react";
import { FlaskConical } from "lucide-react";

/**
 * Bright, attention-grabbing banner shown whenever the app is running in demo
 * mode (i.e. against the mock data shop instead of a real Shopify store).
 */
export default function DemoBanner() {
  return (
    <div className="w-full bg-amber-400 text-amber-900 text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-sm">
      <FlaskConical className="w-4 h-4 shrink-0" />
      <span>
        Demo Mode &mdash; you&apos;re viewing mock data. Install the app on your Shopify store to see your real products.
      </span>
    </div>
  );
}

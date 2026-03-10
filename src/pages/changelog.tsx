import PublicResourceLayout from "@/components/PublicResourceLayout";

const entries = [
  {
    version: "March 2026",
    updates: [
      "Added demo-mode mock catalog workflows for previewing, applying, rolling back, and scheduling price changes.",
      "Improved calendar visibility for scheduled campaigns directly on the calendar grid.",
      "Updated dashboard, calendar, history, and bulk pricing UI with a lighter glass-style SaaS design.",
      "Expanded multi-select filtering for collections, vendors, and product types.",
    ],
  },
  {
    version: "Initial release",
    updates: [
      "Bulk pricing previews and apply flows for Shopify merchants.",
      "Rollback history and activity tracking.",
      "Scheduled price changes and plan-based usage limits.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <PublicResourceLayout
      title="Changelog"
      description="Notable product updates and improvements for BulkPrice."
    >
      <div className="space-y-4">
        {entries.map((entry) => (
          <section key={entry.version} className="action-card section-card p-6">
            <h2 className="section-title font-semibold text-gray-900 mb-3">{entry.version}</h2>
            <ul className="space-y-2 body-compact text-gray-700">
              {entry.updates.map((update) => (
                <li key={update}>• {update}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PublicResourceLayout>
  );
}
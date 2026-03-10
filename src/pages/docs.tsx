import PublicResourceLayout from "@/components/PublicResourceLayout";

const sections = [
  {
    title: "Core features",
    body:
      "BulkPrice supports bulk price edits, previewing, rollback, activity history, advanced product filtering, and scheduled campaigns for future sales.",
  },
  {
    title: "Who this app is for",
    body:
      "Merchants who need to update many Shopify prices quickly, run flash sales, plan promotions, or safely test changes before publishing them.",
  },
  {
    title: "Demo mode",
    body:
      "The public demo experience uses mock Shopify-like data so merchants can safely explore workflows without modifying a live store.",
  },
  {
    title: "Support resources",
    body:
      "Use the FAQ for common questions, the tutorial for setup guidance, pricing for plan details, and the privacy policy for data-handling information.",
  },
];

export default function DocsPage() {
  return (
    <PublicResourceLayout
      title="Documentation"
      description="Overview documentation for merchants evaluating or using BulkPrice."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title} className="action-card section-card">
            <h2 className="card-title font-semibold text-gray-900 mb-2">{section.title}</h2>
            <p className="body-compact text-gray-700">{section.body}</p>
          </section>
        ))}
      </div>
    </PublicResourceLayout>
  );
}
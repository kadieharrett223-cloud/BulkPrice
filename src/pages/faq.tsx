import PublicResourceLayout from "@/components/PublicResourceLayout";

const faqs = [
  {
    question: "How does BulkPrice work?",
    answer:
      "BulkPrice lets merchants filter products, preview pricing changes, apply updates in bulk, schedule timed campaigns, and rollback recent changes when needed.",
  },
  {
    question: "Will demo mode change my real Shopify prices?",
    answer:
      "No. Demo mode uses mock data only and simulates successful updates so merchants can explore the workflow safely before installing the app on a live store.",
  },
  {
    question: "Can I preview price changes before applying them?",
    answer:
      "Yes. The app includes preview counts and preview pricing tables so merchants can verify the impact before running a bulk update.",
  },
  {
    question: "Can I schedule sales in advance?",
    answer:
      "Yes. Premium merchants can schedule price changes for future start and end times, with optional automatic price restoration when the promotion ends.",
  },
  {
    question: "Can I undo a bulk update?",
    answer:
      "Yes. BulkPrice stores rollback data for recent changes so merchants can restore prior values when rollback is available.",
  },
  {
    question: "What plans are available?",
    answer:
      "Starter is $1.99/month with 5 bulk price changes per month. Premium is $5.99/month with unlimited changes, scheduling, advanced filters, and margin protection. Both include a 7-day trial.",
  },
];

export default function FaqPage() {
  return (
    <PublicResourceLayout
      title="Frequently Asked Questions"
      description="Quick answers for installation, demo mode, pricing changes, scheduling, rollback, and billing."
    >
      <div className="space-y-4">
        {faqs.map((item) => (
          <section key={item.question} className="action-card section-card">
            <h2 className="card-title font-semibold text-gray-900 mb-2">{item.question}</h2>
            <p className="body-compact text-gray-700">{item.answer}</p>
          </section>
        ))}
      </div>
    </PublicResourceLayout>
  );
}
import PublicResourceLayout from "@/components/PublicResourceLayout";

const plans = [
  {
    name: "Starter",
    price: "$4.99/month",
    subtitle: "7-day free trial",
    features: [
      "5 bulk price changes per month",
      "Bulk price updates",
      "Price history",
      "Rollback support",
    ],
  },
  {
    name: "Premium",
    price: "$7.99/month",
    subtitle: "7-day free trial",
    features: [
      "Unlimited bulk price changes",
      "Scheduled price changes",
      "Advanced filters",
      "Margin protection",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  return (
    <PublicResourceLayout
      title="Pricing"
      description="Current BulkPrice subscription plans for Shopify merchants."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <section key={plan.name} className="action-card section-card p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{plan.name}</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{plan.price}</h2>
            <p className="mt-1 body-compact text-gray-600">{plan.subtitle}</p>
            <ul className="mt-4 space-y-2 body-compact text-gray-700">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PublicResourceLayout>
  );
}
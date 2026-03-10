import PublicResourceLayout from "@/components/PublicResourceLayout";

const steps = [
  "Install BulkPrice from Shopify and complete the Shopify authentication flow.",
  "Open the Bulk Pricing page and choose product filters such as collection, vendor, type, price range, or inventory range.",
  "Select a pricing action like percentage increase, sale discount, fixed change, exact price, or rounding rule.",
  "Run Preview Changes to review the impact before applying anything to the store.",
  "Confirm and apply the update, then review the History page for a record of the change.",
  "Use the Calendar page on Premium to schedule future sales and auto-revert pricing after promotions end.",
];

export default function TutorialPage() {
  return (
    <PublicResourceLayout
      title="Getting Started Tutorial"
      description="A simple walkthrough for installing BulkPrice, previewing price changes, running a bulk update, and scheduling promotions."
    >
      <section className="space-y-4">
        {steps.map((step, index) => (
          <div key={step} className="action-card section-card flex items-start gap-4">
            <div className="icon-pill text-blue-700 font-semibold">{index + 1}</div>
            <p className="body-compact text-gray-700 pt-1">{step}</p>
          </div>
        ))}
      </section>
    </PublicResourceLayout>
  );
}
import PublicResourceLayout from "@/components/PublicResourceLayout";

export default function PrivacyPage() {
  return (
    <PublicResourceLayout
      title="Privacy Policy"
      description="How BulkPrice collects, uses, stores, and deletes merchant data when merchants install and use the app. Last updated: March 10, 2026."
    >
      <section className="space-y-3">
        <h2 className="section-title font-semibold text-gray-900">1. Information we collect</h2>
        <p>
          BulkPrice processes store information needed to provide bulk price editing, scheduling,
          preview, rollback, billing, and support functionality. This may include shop domain,
          product and variant details, collection names, pricing data, scheduled pricing rules,
          usage history, billing plan status, and technical logs required to secure and operate the app.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title font-semibold text-gray-900">2. How we use merchant data</h2>
        <p>
          We use merchant data only to operate the app features requested by the merchant, including
          generating previews, applying price changes, storing rollback snapshots, syncing catalog
          data from Shopify, scheduling future changes, enforcing plan limits, preventing abuse,
          and troubleshooting support requests.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title font-semibold text-gray-900">3. Data sharing</h2>
        <p>
          We do not sell merchant data. Data is shared only with service providers and platform
          infrastructure required to host and operate BulkPrice, and with Shopify where necessary
          to complete authenticated app actions and billing workflows.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title font-semibold text-gray-900">4. Retention and deletion</h2>
        <p>
          Merchant data is retained only for as long as needed to provide the service, maintain
          logs, support rollback workflows, comply with legal obligations, and resolve disputes.
          When the app is uninstalled, BulkPrice processes required Shopify privacy webhooks and
          removes or anonymizes store data according to Shopify requirements and operational needs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title font-semibold text-gray-900">5. Security</h2>
        <p>
          We use authenticated Shopify sessions, request verification, transport security, and
          controlled access to protect merchant data. No method of transmission or storage is fully
          guaranteed, but we take reasonable steps to safeguard the information processed by the app.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title font-semibold text-gray-900">6. Merchant rights</h2>
        <p>
          Merchants may request information about their data, request deletion where applicable,
          or uninstall the app to stop future processing. Shopify privacy webhooks are supported for
          customer data requests, customer redaction, and shop redaction workflows.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title font-semibold text-gray-900">7. Policy updates</h2>
        <p>
          This policy may be updated from time to time to reflect product, legal, or platform
          changes. The latest version will always be posted on this page.
        </p>
      </section>
    </PublicResourceLayout>
  );
}
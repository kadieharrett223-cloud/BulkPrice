import { shopify } from "./shopify-config";
import { Session } from "@shopify/shopify-api";

export interface BillingPlan {
  name: string;
  price: number;
  trialDays: number;
  features: string[];
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  starter: {
    name: "Starter Plan",
    price: 1.99,
    trialDays: 7,
    features: [
      "5 bulk price changes per month",
      "Bulk price updates",
      "Price history",
      "Rollback support",
      "CSV import/export",
    ],
  },
  premium: {
    name: "Premium Plan",
    price: 9.99,
    trialDays: 7,
    features: [
      "Unlimited bulk price changes",
      "Scheduled price changes",
      "Advanced filters",
      "Margin protection",
      "Priority support",
    ],
  },
};

export async function createRecurringCharge(
  session: Session,
  plan: keyof typeof BILLING_PLANS
): Promise<string> {
  const planDetails = BILLING_PLANS[plan];

  if (!planDetails) {
    throw new Error("Invalid plan selected");
  }

  const client = new shopify.clients.Graphql({ session });

  const response = await client.query({
    data: {
      query: `mutation AppSubscriptionCreate($name: String!, $price: Decimal!, $trialDays: Int!) {
        appSubscriptionCreate(
          name: $name
          returnUrl: "${process.env.SHOPIFY_APP_URL}?charge_id={charge_id}"
          test: ${process.env.NODE_ENV !== "production"}
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: $price, currencyCode: USD }
                  interval: EVERY_30_DAYS
                }
              }
            }
          ]
          trialDays: $trialDays
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
      variables: {
        name: planDetails.name,
        price: planDetails.price,
        trialDays: planDetails.trialDays,
      },
    },
  });

  const { data } = response.body as any;

  if (data.appSubscriptionCreate.userErrors.length > 0) {
    throw new Error(data.appSubscriptionCreate.userErrors[0].message);
  }

  return data.appSubscriptionCreate.confirmationUrl;
}

export async function checkSubscriptionStatus(session: Session): Promise<{
  hasActiveSubscription: boolean;
  plan?: string;
  status?: string;
}> {
  const client = new shopify.clients.Graphql({ session });

  const response = await client.query({
    data: {
      query: `{
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            test
            trialDays
            currentPeriodEnd
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }`,
    },
  });

  const { data } = response.body as any;
  const subscriptions = data.currentAppInstallation.activeSubscriptions;

  if (subscriptions.length === 0) {
    return { hasActiveSubscription: false };
  }

  const subscription = subscriptions[0];

  return {
    hasActiveSubscription: subscription.status === "ACTIVE",
    plan: subscription.name,
    status: subscription.status,
  };
}

export async function cancelSubscription(
  session: Session,
  subscriptionId: string
): Promise<boolean> {
  const client = new shopify.clients.Graphql({ session });

  const response = await client.query({
    data: {
      query: `mutation AppSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      variables: {
        id: subscriptionId,
      },
    },
  });

  const { data } = response.body as any;

  if (data.appSubscriptionCancel.userErrors.length > 0) {
    throw new Error(data.appSubscriptionCancel.userErrors[0].message);
  }

  return true;
}

export type Ga4Purchase = {
  analyticsConsent: boolean;
  clientId?: string | null;
  currency: string;
  plan: string;
  transactionId: string;
  userId: string;
  valueCents: number;
};

export type Ga4DeliveryResult = {
  reason?: "analytics_consent_missing" | "ga4_not_configured";
  sent: boolean;
};

type FetchLike = typeof fetch;

export async function sendGa4Purchase(
  purchase: Ga4Purchase,
  environment: NodeJS.ProcessEnv = process.env,
  fetcher: FetchLike = fetch
): Promise<Ga4DeliveryResult> {
  if (!purchase.analyticsConsent) {
    return { reason: "analytics_consent_missing", sent: false };
  }

  const measurementId = (
    environment.GA4_MEASUREMENT_ID
    ?? environment.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
    ?? ""
  ).trim();
  const apiSecret = (environment.GA4_API_SECRET ?? "").trim();
  if (!measurementId || !apiSecret) {
    return { reason: "ga4_not_configured", sent: false };
  }

  const response = await fetcher(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
    {
      body: JSON.stringify({
        client_id: purchase.clientId || `revenue.${purchase.userId}`,
        user_id: purchase.userId,
        events: [{
          name: "purchase",
          params: {
            currency: purchase.currency,
            engagement_time_msec: 1,
            items: [{
              item_id: purchase.plan,
              item_name: purchase.plan,
              price: purchase.valueCents / 100,
              quantity: 1
            }],
            transaction_id: purchase.transactionId,
            value: purchase.valueCents / 100
          }
        }]
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    }
  );

  if (!response.ok) {
    throw new Error(`ga4_measurement_protocol_failed_${response.status}`);
  }
  return { sent: true };
}

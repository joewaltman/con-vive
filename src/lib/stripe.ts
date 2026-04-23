import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const RESERVATION_PRICE = parseInt(process.env.RESERVATION_PRICE || "4000", 10);

export async function issueRefund(
  paymentIntentId: string,
  amountCents?: number
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const stripe = getStripe();
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (amountCents) {
      refundParams.amount = amountCents;
    }
    const refund = await stripe.refunds.create(refundParams);
    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  try {
    const stripe = getStripe();
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Stripe getPaymentIntent error:', error);
    return null;
  }
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://con-vive.com";
}

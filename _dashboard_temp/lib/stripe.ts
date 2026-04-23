import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

/**
 * Issue a refund for a payment.
 * @param paymentIntentId - The Stripe payment intent ID
 * @param amountCents - Optional amount to refund (partial refund). If not provided, full refund.
 */
export async function issueRefund(
  paymentIntentId: string,
  amountCents?: number
): Promise<RefundResult> {
  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amountCents !== undefined) {
      refundParams.amount = amountCents;
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      success: true,
      refundId: refund.id,
    };
  } catch (err) {
    console.error('Stripe refund error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get payment intent details
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    console.error('Stripe retrieve error:', err);
    return null;
  }
}

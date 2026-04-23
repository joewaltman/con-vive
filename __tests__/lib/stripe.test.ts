// Create mock functions at module scope
const mockRefundsCreate = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn();

// Mock Stripe module
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    refunds: {
      create: (...args: unknown[]) => mockRefundsCreate(...args),
    },
    paymentIntents: {
      retrieve: (...args: unknown[]) => mockPaymentIntentsRetrieve(...args),
    },
  }));
});

// Import after mock setup
import { issueRefund, getPaymentIntent } from '@/lib/stripe';

describe('issueRefund', () => {
  beforeEach(() => {
    mockRefundsCreate.mockReset();
  });

  it('returns success with refund ID on successful full refund', async () => {
    mockRefundsCreate.mockResolvedValue({ id: 're_test123' });

    const result = await issueRefund('pi_test123');

    expect(result.success).toBe(true);
    expect(result.refundId).toBe('re_test123');
    expect(mockRefundsCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_test123',
    });
  });

  it('supports partial refunds with amount', async () => {
    mockRefundsCreate.mockResolvedValue({ id: 're_partial123' });

    const result = await issueRefund('pi_test123', 2000);

    expect(result.success).toBe(true);
    expect(mockRefundsCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_test123',
      amount: 2000,
    });
  });

  it('returns error on Stripe failure', async () => {
    mockRefundsCreate.mockRejectedValue(new Error('Card was declined'));

    const result = await issueRefund('pi_test123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Card was declined');
  });
});

describe('getPaymentIntent', () => {
  beforeEach(() => {
    mockPaymentIntentsRetrieve.mockReset();
  });

  it('returns payment intent on success', async () => {
    const mockPaymentIntent = {
      id: 'pi_test123',
      amount: 4000,
      status: 'succeeded',
    };
    mockPaymentIntentsRetrieve.mockResolvedValue(mockPaymentIntent);

    const result = await getPaymentIntent('pi_test123');

    expect(result).toEqual(mockPaymentIntent);
    expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith('pi_test123');
  });

  it('returns null on error', async () => {
    mockPaymentIntentsRetrieve.mockRejectedValue(new Error('Not found'));

    const result = await getPaymentIntent('pi_invalid');

    expect(result).toBeNull();
  });
});

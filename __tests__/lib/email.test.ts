import React from 'react';

// Create mock functions at module scope
const mockSend = jest.fn();

// Mock Resend module
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: (...args: unknown[]) => mockSend(...args),
      },
    })),
  };
});

// Import after mock setup
import { sendEmail } from '@/lib/email';

describe('sendEmail', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('returns success when email is sent', async () => {
    mockSend.mockResolvedValue({ data: { id: 'test-email-id' }, error: null });

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      react: React.createElement('div', null, 'Test'),
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe('test-email-id');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Subject',
      })
    );
  });

  it('returns error when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      react: React.createElement('div', null, 'Test'),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });

  it('handles exceptions gracefully', async () => {
    mockSend.mockRejectedValue(new Error('Network error'));

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      react: React.createElement('div', null, 'Test'),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('uses correct from address', async () => {
    mockSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      react: React.createElement('div', null, 'Test'),
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining('Joe from Con-Vive'),
      })
    );
  });
});

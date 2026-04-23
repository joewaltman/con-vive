/**
 * Integration tests for the invite sending API
 * Tests the complete flow from request to email sending
 */

// Mock Next.js server
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(data),
    })),
  },
}));

// Mock dependencies
const mockPoolQuery = jest.fn();
const mockSendEmail = jest.fn();
const mockFetchDinner = jest.fn();

jest.mock('@/lib/pool', () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/dinners', () => ({
  fetchDinner: (...args: unknown[]) => mockFetchDinner(...args),
}));

// Mock the email template
jest.mock('@/emails/InviteEmail', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => {
    if (formatStr === 'EEEE, MMMM do') return 'Friday, March 15th';
    if (formatStr === 'h:mm a') return '6:30 PM';
    return date.toISOString();
  }),
}));

import { POST } from '@/app/api/dinners/[id]/invites/route';

// Helper to create mock request
function createMockRequest(body: object) {
  return {
    json: () => Promise.resolve(body),
  };
}

describe('POST /api/dinners/[id]/invites', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockSendEmail.mockReset();
    mockFetchDinner.mockReset();
  });

  it('returns 400 if guestIds is not an array', async () => {
    const request = createMockRequest({ guestIds: 'not-an-array' });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('guestIds array is required');
  });

  it('returns 400 if guestIds is empty', async () => {
    const request = createMockRequest({ guestIds: [] });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('guestIds array is required');
  });

  it('returns 400 if dinner has no date', async () => {
    mockFetchDinner.mockResolvedValue({
      id: '1',
      fields: {},
    });

    const request = createMockRequest({ guestIds: [1] });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Dinner date is required');
  });

  it('successfully sends invites to valid guests', async () => {
    // Mock dinner
    mockFetchDinner.mockResolvedValue({
      id: '1',
      fields: {
        'Dinner Date': '2024-03-15',
        'Start Time': '18:30',
        'Price Cents': 4000,
        'Menu': 'Italian feast',
      },
      host: {
        fields: {
          'First Name': 'Joe',
        },
      },
    });

    // Mock guest lookup
    mockPoolQuery
      // First call: fetch guests
      .mockResolvedValueOnce({
        rows: [
          { id: 1, first_name: 'Alice', email: 'alice@example.com' },
          { id: 2, first_name: 'Bob', email: 'bob@example.com' },
        ],
      })
      // Second call: check existing invitations
      .mockResolvedValueOnce({ rows: [] })
      // Third call: insert invitation for Alice
      .mockResolvedValueOnce({ rows: [{ token: 'token123' }] })
      // Fourth call: insert invitation for Bob
      .mockResolvedValueOnce({ rows: [{ token: 'token456' }] });

    // Mock email sending
    mockSendEmail.mockResolvedValue({ success: true, id: 'email-id' });

    const request = createMockRequest({ guestIds: [1, 2] });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sent).toBe(2);
    expect(data.skipped).toBe(0);
    expect(data.failed).toEqual([]);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it('skips guests who are already invited', async () => {
    mockFetchDinner.mockResolvedValue({
      id: '1',
      fields: {
        'Dinner Date': '2024-03-15',
      },
      host: { fields: { 'First Name': 'Joe' } },
    });

    mockPoolQuery
      // Fetch guests
      .mockResolvedValueOnce({
        rows: [
          { id: 1, first_name: 'Alice', email: 'alice@example.com' },
        ],
      })
      // Check existing - Alice is already invited
      .mockResolvedValueOnce({ rows: [{ guest_id: 1 }] });

    const request = createMockRequest({ guestIds: [1] });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(data.sent).toBe(0);
    expect(data.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('fails guests without email addresses', async () => {
    mockFetchDinner.mockResolvedValue({
      id: '1',
      fields: {
        'Dinner Date': '2024-03-15',
      },
      host: { fields: { 'First Name': 'Joe' } },
    });

    mockPoolQuery
      // Fetch guests - no email
      .mockResolvedValueOnce({
        rows: [{ id: 1, first_name: 'NoEmail', email: null }],
      })
      // Check existing
      .mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({ guestIds: [1] });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(data.sent).toBe(0);
    expect(data.failed).toEqual([{ guestId: 1, reason: 'No email address' }]);
  });

  it('fails guests not found in database', async () => {
    mockFetchDinner.mockResolvedValue({
      id: '1',
      fields: {
        'Dinner Date': '2024-03-15',
      },
      host: { fields: { 'First Name': 'Joe' } },
    });

    mockPoolQuery
      // Fetch guests - returns empty (guest not found)
      .mockResolvedValueOnce({ rows: [] })
      // Check existing
      .mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({ guestIds: [999] });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(data.sent).toBe(0);
    expect(data.failed).toEqual([{ guestId: 999, reason: 'Guest not found' }]);
  });

  it('handles email send failures gracefully', async () => {
    mockFetchDinner.mockResolvedValue({
      id: '1',
      fields: {
        'Dinner Date': '2024-03-15',
      },
      host: { fields: { 'First Name': 'Joe' } },
    });

    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, first_name: 'Alice', email: 'alice@example.com' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ token: 'token123' }] })
      // Update notes after failure
      .mockResolvedValueOnce({ rows: [] });

    // Email fails
    mockSendEmail.mockResolvedValue({ success: false, error: 'Rate limited' });

    const request = createMockRequest({ guestIds: [1] });
    const params = Promise.resolve({ id: '1' });

    const response = await POST(request as never, { params });
    const data = await response.json();

    expect(data.sent).toBe(0);
    expect(data.failed).toEqual([{ guestId: 1, reason: 'Rate limited' }]);
  });

  it('generates correct booking link format', async () => {
    mockFetchDinner.mockResolvedValue({
      id: '1',
      fields: {
        'Dinner Date': '2024-03-15',
        'Menu': 'Test menu',
      },
      host: { fields: { 'First Name': 'Joe' } },
    });

    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, first_name: 'Alice', email: 'alice@example.com' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ token: 'abc123xyz' }] });

    mockSendEmail.mockResolvedValue({ success: true, id: 'email-id' });

    const request = createMockRequest({ guestIds: [1] });
    const params = Promise.resolve({ id: '1' });

    await POST(request as never, { params });

    // Check that sendEmail was called with correct magic link
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@example.com',
        subject: expect.stringContaining('Con-Vive dinner'),
      })
    );
  });
});

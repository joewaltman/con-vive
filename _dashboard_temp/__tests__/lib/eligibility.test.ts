// Mock the pool module before importing eligibility
jest.mock('@/lib/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { fetchEligibleGuests } from '@/lib/eligibility';
import { pool } from '@/lib/pool';

const mockQuery = pool.query as jest.Mock;

describe('fetchEligibleGuests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns mapped guests from query results', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          first_name: 'Alice',
          last_name: 'Smith',
          gender: 'Female',
          priority: 1,
          spark_score: 8,
          solo_or_couple: 'Solo',
          available_days: ['Sat', 'Sun'],
          dietary_restrictions: ['Vegetarian'],
          dietary_notes: null,
          email: 'alice@example.com',
          about: 'Tech founder',
          what_do_you_do: null,
          curious_about: null,
          social_summary: null,
          last_attended_date: '2024-01-01',
          last_invited_date: '2024-01-10',
        },
        {
          id: 2,
          first_name: 'Bob',
          last_name: 'Jones',
          gender: 'Male',
          priority: 2,
          spark_score: 7,
          solo_or_couple: 'Solo',
          available_days: ['Sat'],
          dietary_restrictions: null,
          dietary_notes: null,
          email: 'bob@example.com',
          about: null,
          what_do_you_do: 'Software engineer',
          curious_about: null,
          social_summary: null,
          last_attended_date: null,
          last_invited_date: null,
        },
      ],
    });

    const result = await fetchEligibleGuests({
      dinnerId: '1',
      dinnerDate: '2024-02-01',
      dinnerDayOfWeek: 'Sat',
      dinnerType: 'couples_allowed',
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      firstName: 'Alice',
      lastName: 'Smith',
      gender: 'Female',
      priority: 1,
      sparkScore: 8,
      soloOrCouple: 'Solo',
      availableDays: ['Sat', 'Sun'],
      dietaryRestrictions: ['Vegetarian'],
      dietaryNotes: null,
      email: 'alice@example.com',
      lastAttendedDate: '2024-01-01',
      lastInvitedDate: '2024-01-10',
      bioSnippet: 'Tech founder',
    });
    expect(result[1].bioSnippet).toBe('Software engineer');
  });

  it('passes correct parameters to query', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await fetchEligibleGuests({
      dinnerId: '5',
      dinnerDate: '2024-03-15',
      dinnerDayOfWeek: 'Fri',
      dinnerType: 'singles_only',
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [query, params] = mockQuery.mock.calls[0];

    // Check params
    expect(params).toEqual(['5', '2024-03-15', 'Fri']);

    // Check that singles_only clause is included
    expect(query).toContain("solo_or_couple = 'Solo'");
  });

  it('includes dietary exclusion clause when specified', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await fetchEligibleGuests({
      dinnerId: '1',
      dinnerDate: '2024-02-01',
      dinnerDayOfWeek: 'Sat',
      dinnerType: 'couples_allowed',
      excludeDietary: ['Vegan', 'No Gluten'],
    });

    const [query, params] = mockQuery.mock.calls[0];

    // Should have dinner params plus dietary params
    expect(params).toEqual(['1', '2024-02-01', 'Sat', 'Vegan', 'No Gluten']);

    // Query should include dietary exclusion
    expect(query).toContain('dietary_restrictions');
  });

  it('does not include singles_only clause for couples_allowed', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await fetchEligibleGuests({
      dinnerId: '1',
      dinnerDate: '2024-02-01',
      dinnerDayOfWeek: 'Sat',
      dinnerType: 'couples_allowed',
    });

    const [query] = mockQuery.mock.calls[0];
    expect(query).not.toContain("solo_or_couple = 'Solo'");
  });

  it('handles guests with no bio fields', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          first_name: 'NoProfile',
          last_name: 'Person',
          gender: null,
          priority: 1,
          spark_score: null,
          solo_or_couple: null,
          available_days: null,
          dietary_restrictions: null,
          dietary_notes: null,
          email: null,
          about: null,
          what_do_you_do: null,
          curious_about: null,
          social_summary: null,
          last_attended_date: null,
          last_invited_date: null,
        },
      ],
    });

    const result = await fetchEligibleGuests({
      dinnerId: '1',
      dinnerDate: '2024-02-01',
      dinnerDayOfWeek: 'Sat',
      dinnerType: 'couples_allowed',
    });

    expect(result[0].bioSnippet).toBeNull();
    expect(result[0].email).toBeNull();
    expect(result[0].gender).toBeNull();
  });
});

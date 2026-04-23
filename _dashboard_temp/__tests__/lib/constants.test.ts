import {
  FUNNEL_STAGES,
  getFunnelStageColor,
  getDinnerStatusColor,
  getInvitationStatusColor,
  DEFAULT_TOTAL_SEATS,
  DEFAULT_MIN_PER_GENDER,
  DEFAULT_PRICE_CENTS,
  DEFAULT_BRING_SLOTS,
  DINNER_STATUS_OPTIONS,
  INVITATION_STATUS_OPTIONS,
} from '@/lib/constants';

describe('Funnel Stages', () => {
  it('has the expected stages in order', () => {
    const stageValues = FUNNEL_STAGES.map(s => s.value);
    expect(stageValues).toEqual([
      'Partial',
      'New',
      'Call Scheduled',
      'Call Done',
      'Dinner Ready',
      'Invited',
      'Attended',
      'Declined',
    ]);
  });

  it('returns correct color for known stage', () => {
    expect(getFunnelStageColor('Attended')).toBe('#B85C38'); // terracotta
    expect(getFunnelStageColor('New')).toBe('#3B82F6'); // blue
  });

  it('returns default gray for unknown stage', () => {
    expect(getFunnelStageColor('Unknown Stage')).toBe('#9CA3AF');
  });
});

describe('Dinner Status', () => {
  it('has all expected status values', () => {
    const statusValues = DINNER_STATUS_OPTIONS.map(s => s.value);
    expect(statusValues).toContain('draft');
    expect(statusValues).toContain('open');
    expect(statusValues).toContain('full');
    expect(statusValues).toContain('completed');
    expect(statusValues).toContain('cancelled');
  });

  it('returns correct color for known status', () => {
    expect(getDinnerStatusColor('open')).toBe('#22C55E'); // green
    expect(getDinnerStatusColor('cancelled')).toBe('#EF4444'); // red
  });

  it('returns default gray for unknown status', () => {
    expect(getDinnerStatusColor('unknown')).toBe('#9CA3AF');
  });
});

describe('Invitation Status', () => {
  it('has all expected status values', () => {
    const statusValues = INVITATION_STATUS_OPTIONS.map(s => s.value);
    expect(statusValues).toContain('invited');
    expect(statusValues).toContain('checkout_pending');
    expect(statusValues).toContain('confirmed');
    expect(statusValues).toContain('cancelled');
    expect(statusValues).toContain('declined');
    expect(statusValues).toContain('expired');
  });

  it('returns correct color for known status', () => {
    expect(getInvitationStatusColor('confirmed')).toBe('#22C55E'); // green
    expect(getInvitationStatusColor('invited')).toBe('#F59E0B'); // amber
  });

  it('returns default gray for null status', () => {
    expect(getInvitationStatusColor(null)).toBe('#9CA3AF');
  });
});

describe('Dinner Defaults', () => {
  it('has correct default values', () => {
    expect(DEFAULT_TOTAL_SEATS).toBe(8);
    expect(DEFAULT_MIN_PER_GENDER).toBe(2);
    expect(DEFAULT_PRICE_CENTS).toBe(4000); // $40
  });

  it('has correct default bring slots', () => {
    expect(DEFAULT_BRING_SLOTS).toEqual({
      wine: 3,
      appetizer: 3,
      dessert: 2,
    });
  });
});

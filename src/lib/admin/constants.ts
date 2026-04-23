// Funnel Stage options with colors
export const FUNNEL_STAGES = [
  { value: 'Partial', color: '#9CA3AF' },        // gray
  { value: 'New', color: '#3B82F6' },            // blue
  { value: 'Call Scheduled', color: '#8B5CF6' }, // purple
  { value: 'Call Done', color: '#F59E0B' },      // amber
  { value: 'Dinner Ready', color: '#10B981' },   // green
  { value: 'Invited', color: '#06B6D4' },        // cyan
  { value: 'Attended', color: '#B85C38' },       // terracotta (primary)
  { value: 'Declined', color: '#EF4444' },       // red
] as const;

export const FUNNEL_STAGE_OPTIONS = FUNNEL_STAGES.map(s => s.value);

export const getFunnelStageColor = (stage: string): string => {
  const found = FUNNEL_STAGES.find(s => s.value === stage);
  return found?.color ?? '#9CA3AF';
};

// Gender options
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Prefer not to say',
] as const;

// Age Range options
export const AGE_RANGE_OPTIONS = [
  'Under 30',
  '30-39',
  '40-49',
  '50-59',
  '60-69',
  '70+',
] as const;

// Solo or Couple options
export const SOLO_OR_COUPLE_OPTIONS = [
  'Solo',
  'Couple',
  'Flexible',
  'Not Discussed',
] as const;

// Available Days options
export const AVAILABLE_DAYS_OPTIONS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
  'Not Discussed',
] as const;

// Dietary Restrictions options
export const DIETARY_RESTRICTIONS_OPTIONS = [
  'None',
  'Vegetarian',
  'Vegan',
  'No Red Meat',
  'No Fish',
  'No Shellfish',
  'No Dairy',
  'Lactose Intolerant',
  'No Gluten',
  'No Pork',
  'Other',
] as const;

// Hosting Interest options
export const HOSTING_INTEREST_OPTIONS = [
  'Yes',
  'Maybe',
  'No',
  'Not Discussed',
] as const;

// Brand colors
export const COLORS = {
  terracotta: '#B85C38',
  cream: '#FAF5F0',
  terracottaLight: '#D4795A',
  terracottaDark: '#8B4730',
} as const;

// Auth
export const AUTH_COOKIE_NAME = 'convive-auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// Routing Status Options
export const ROUTING_STATUS_OPTIONS = ['green', 'yellow', 'red', 'deprioritized'] as const;
export type RoutingStatus = typeof ROUTING_STATUS_OPTIONS[number];

// Invitation Response Options
export const INVITATION_RESPONSE_OPTIONS = [
  { value: 'Accepted', label: 'Accepted', color: '#22C55E' },
  { value: 'Declined', label: 'Declined', color: '#EF4444' },
  { value: 'Invited', label: 'Invited', color: '#F59E0B' },
  { value: null, label: 'No Response', color: '#9CA3AF' },
] as const;

// Bring Item Categories
export const BRING_ITEM_CATEGORIES = [
  'Wine',
  'Appetizer',
  'Dessert',
  'Salad',
  'Side Dish',
  'Other',
] as const;

// Dinner Defaults
export const DEFAULT_START_TIME = '18:00';
export const DEFAULT_GUEST_COUNT = 7;
export const DEFAULT_MAX_GUESTS = 8;
export const DEFAULT_TOTAL_SEATS = 8;
export const DEFAULT_MIN_PER_GENDER = 2;
export const DEFAULT_PRICE_CENTS = 4000;
export const DEFAULT_BRING_SLOTS = { wine: 3, appetizer: 3, dessert: 2 };

// Dinner Status Options
export const DINNER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: '#9CA3AF' },
  { value: 'open', label: 'Open', color: '#22C55E' },
  { value: 'full', label: 'Full', color: '#3B82F6' },
  { value: 'completed', label: 'Completed', color: '#6B7280' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
] as const;

export const getDinnerStatusColor = (status: string): string => {
  const found = DINNER_STATUS_OPTIONS.find(s => s.value === status);
  return found?.color ?? '#9CA3AF';
};

// Invitation Status Options (for new booking flow)
export const INVITATION_STATUS_OPTIONS = [
  { value: 'invited', label: 'Invited', color: '#F59E0B' },
  { value: 'checkout_pending', label: 'Checkout Pending', color: '#8B5CF6' },
  { value: 'confirmed', label: 'Confirmed', color: '#22C55E' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
  { value: 'declined', label: 'Declined', color: '#6B7280' },
  { value: 'expired', label: 'Expired', color: '#9CA3AF' },
] as const;

export const getInvitationStatusColor = (status: string | null): string => {
  if (!status) return '#9CA3AF';
  const found = INVITATION_STATUS_OPTIONS.find(s => s.value === status);
  return found?.color ?? '#9CA3AF';
};

// Dinner Type Options
export const DINNER_TYPE_OPTIONS = [
  { value: 'couples_allowed', label: 'Couples Allowed' },
  { value: 'singles_only', label: 'Singles Only' },
] as const;

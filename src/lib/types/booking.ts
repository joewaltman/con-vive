export interface BringItem {
  slot: number;
  name: string;
  claimed_by_guest_id: number | null;
  claimed_by_name: string | null;
}

export interface Dinner {
  id: number;
  name: string;
  date: string;
  time: string;
  price_cents: number;
  address: string | null;
  google_maps_link: string | null;
  parking_instructions: string | null;
  what_to_bring: string | null;
  host_name: string | null;
  bring_items: BringItem[];
  menu: string | null;
}

export interface Invitation {
  id: number;
  dinner_id: number;
  guest_id: number;
  token: string;
  status: "pending" | "booked" | "cancelled";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  booked_at: string | null;
  cancelled_at: string | null;
  confirmation_email_sent_at: string | null;
  reminder_email_sent_at: string | null;
  bring_item_slot: number | null;
  created_at: string;
}

export interface Guest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_clean: string | null;
  gender: string | null;
}

export interface GenderCounts {
  male: number;
  female: number;
  other: number;
}

export interface BookingPageData {
  invitation: Invitation;
  dinner: Dinner;
  guest: Guest;
  genderCounts: GenderCounts;
  canBook: boolean;
  blockReason: string | null;
}

export interface BookingConstraintResult {
  allowed: boolean;
  reason: string | null;
}

// Feedback types
export interface FeedbackRating {
  rateeGuestId: number;
  rating: 'yes' | 'no' | 'not_sure';
}

export interface FeedbackSubmission {
  ratings: FeedbackRating[];
  comment?: string;
}

export interface FeedbackAttendee {
  id: number;
  firstName: string;
}

export interface FeedbackPageData {
  dinnerName: string;
  dinnerDate: string;
  attendees: FeedbackAttendee[];
}

// Cal Alumni signup types
export interface CalAlumniSignupData {
  graduation_year: number;
  major: string;
}

export interface CalSignupPage1 {
  firstName: string;
  lastName: string;
  email: string;
  graduationYear: number;
  major: string;
}

export interface CalSignupPage2 {
  phone: string;
  gender: string;
  zipCode: string;
  dietaryRestrictions: string[];
  dietaryNotes?: string;
  availableDays: string[];
  bringItemSlot?: number;
}

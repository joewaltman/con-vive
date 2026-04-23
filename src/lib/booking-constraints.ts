import type { GenderCounts, BookingConstraintResult } from "./types/booking";

const MIN_GENDER_THRESHOLD = 2;

export function checkGenderConstraint(
  genderCounts: GenderCounts,
  guestGender: string | null,
  capacity: number = 6
): BookingConstraintResult {
  // If guest has no gender set, they can't book yet
  if (!guestGender) {
    return {
      allowed: false,
      reason: "Please select your gender to continue booking.",
    };
  }

  const { male, female } = genderCounts;
  const totalBooked = male + female + genderCounts.other;
  const normalizedGender = guestGender.toLowerCase();

  // Check if dinner is full
  if (totalBooked >= capacity) {
    return {
      allowed: false,
      reason: "This dinner is fully booked.",
    };
  }

  const seatsRemaining = capacity - totalBooked;

  // Reserve last MIN_GENDER_THRESHOLD seats for underrepresented gender
  // If one gender is below threshold and remaining seats equals what they need, block the other gender

  if (male < MIN_GENDER_THRESHOLD) {
    const maleSeatsNeeded = MIN_GENDER_THRESHOLD - male;
    // If remaining seats are exactly what men need, only men can book
    if (seatsRemaining <= maleSeatsNeeded && normalizedGender !== "male") {
      return {
        allowed: false,
        reason: `The last ${seatsRemaining === 1 ? "seat is" : `${seatsRemaining} seats are`} reserved for men to ensure a balanced table. Check back soon!`,
      };
    }
  }

  if (female < MIN_GENDER_THRESHOLD) {
    const femaleSeatsNeeded = MIN_GENDER_THRESHOLD - female;
    // If remaining seats are exactly what women need, only women can book
    if (seatsRemaining <= femaleSeatsNeeded && normalizedGender !== "female") {
      return {
        allowed: false,
        reason: `The last ${seatsRemaining === 1 ? "seat is" : `${seatsRemaining} seats are`} reserved for women to ensure a balanced table. Check back soon!`,
      };
    }
  }

  // Otherwise, anyone can book
  return { allowed: true, reason: null };
}

export function getGenderCountsFromBookings(
  bookedGuests: Array<{ gender: string | null }>
): GenderCounts {
  return bookedGuests.reduce(
    (counts, guest) => {
      const gender = guest.gender?.toLowerCase();
      if (gender === "male") {
        counts.male++;
      } else if (gender === "female") {
        counts.female++;
      } else if (gender) {
        counts.other++;
      }
      return counts;
    },
    { male: 0, female: 0, other: 0 }
  );
}

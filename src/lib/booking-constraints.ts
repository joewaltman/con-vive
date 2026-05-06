import type { GenderCounts, BookingConstraintResult } from "./types/booking";

const MIN_GENDER_THRESHOLD = 2;

export function checkGenderConstraint(
  genderCounts: GenderCounts,
  guestGender: string | null,
  capacity: number = 6,
  enforceGenderBalance: boolean = true
): BookingConstraintResult {
  // If gender balance is disabled, only check capacity
  if (!enforceGenderBalance) {
    const total = genderCounts.male + genderCounts.female + genderCounts.other;
    if (total >= capacity) {
      return { allowed: false, reason: "This dinner is fully booked." };
    }
    return { allowed: true, reason: null };
  }

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

/**
 * Check if a couple booking is allowed based on gender constraints.
 * This checks that:
 * 1. 2 seats are available
 * 2. Primary guest can book
 * 3. Adding primary, companion can also book (if companion gender is known)
 */
export function checkCoupleGenderConstraint(
  genderCounts: GenderCounts,
  primaryGender: string | null,
  companionGender: string | null,
  capacity: number = 6,
  enforceGenderBalance: boolean = true
): BookingConstraintResult {
  // If gender balance is disabled, only check capacity for 2
  if (!enforceGenderBalance) {
    const total = genderCounts.male + genderCounts.female + genderCounts.other;
    if (total >= capacity - 1) {
      return { allowed: false, reason: "Not enough seats for a couple booking." };
    }
    return { allowed: true, reason: null };
  }

  // Primary must have gender set
  if (!primaryGender) {
    return {
      allowed: false,
      reason: "Please select your gender to continue booking.",
    };
  }

  const { male, female } = genderCounts;
  const totalBooked = male + female + genderCounts.other;

  // Check if at least 2 seats available
  if (totalBooked >= capacity - 1) {
    return {
      allowed: false,
      reason: "Not enough seats available for a couple booking.",
    };
  }

  // First, check if primary can book
  const primaryCheck = checkGenderConstraint(genderCounts, primaryGender, capacity, enforceGenderBalance);
  if (!primaryCheck.allowed) {
    return primaryCheck;
  }

  // If companion gender is known, simulate adding primary and check companion
  if (companionGender) {
    const normalizedPrimary = primaryGender.toLowerCase();
    const countsAfterPrimary: GenderCounts = { ...genderCounts };

    if (normalizedPrimary === "male") {
      countsAfterPrimary.male++;
    } else if (normalizedPrimary === "female") {
      countsAfterPrimary.female++;
    } else {
      countsAfterPrimary.other++;
    }

    const companionCheck = checkGenderConstraint(countsAfterPrimary, companionGender, capacity, enforceGenderBalance);
    if (!companionCheck.allowed) {
      return {
        allowed: false,
        reason: `Your +1 cannot book: ${companionCheck.reason}`,
      };
    }
  }

  // If companion gender unknown, just trust that 2 seats are available
  // The individual gender constraint for primary was already checked above
  return { allowed: true, reason: null };
}

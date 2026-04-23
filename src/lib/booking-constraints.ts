import type { GenderCounts, BookingConstraintResult } from "./types/booking";

const MIN_GENDER_THRESHOLD = 2;

export function checkGenderConstraint(
  genderCounts: GenderCounts,
  guestGender: string | null
): BookingConstraintResult {
  // If guest has no gender set, they can't book yet
  if (!guestGender) {
    return {
      allowed: false,
      reason: "Please select your gender to continue booking.",
    };
  }

  const { male, female } = genderCounts;
  const normalizedGender = guestGender.toLowerCase();

  // Allow anyone to book if we don't have min threshold of both genders yet
  if (male < MIN_GENDER_THRESHOLD && female < MIN_GENDER_THRESHOLD) {
    return { allowed: true, reason: null };
  }

  // If one gender is below threshold, only allow that gender to book
  if (male < MIN_GENDER_THRESHOLD && normalizedGender !== "male") {
    return {
      allowed: false,
      reason: `We need ${MIN_GENDER_THRESHOLD - male} more ${male === 1 ? "man" : "men"} to book before we can accept more women. Check back soon!`,
    };
  }

  if (female < MIN_GENDER_THRESHOLD && normalizedGender !== "female") {
    return {
      allowed: false,
      reason: `We need ${MIN_GENDER_THRESHOLD - female} more ${female === 1 ? "woman" : "women"} to book before we can accept more men. Check back soon!`,
    };
  }

  // Both genders have met threshold, anyone can book
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

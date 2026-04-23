import type { GuestFields } from './types';

const MAX_SNIPPET_LENGTH = 80;

/**
 * Extract a one-liner bio from guest fields.
 * Priority: social_summary.guest_note > about > what_do_you_do > curious_about
 */
export function extractBioSnippet(fields: GuestFields): string | null {
  // Try social summary guest note first
  if (fields['Social Summary']?.guest_note) {
    return truncate(fields['Social Summary'].guest_note);
  }

  // Try about field
  if (fields['About']) {
    return truncate(fields['About']);
  }

  // Try what do you do
  if (fields['What Do You Do']) {
    return truncate(fields['What Do You Do']);
  }

  // Try curious about
  if (fields['Curious About']) {
    return truncate(fields['Curious About']);
  }

  return null;
}

function truncate(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= MAX_SNIPPET_LENGTH) {
    return cleaned;
  }
  // Truncate at word boundary
  const truncated = cleaned.slice(0, MAX_SNIPPET_LENGTH);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > MAX_SNIPPET_LENGTH - 20) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

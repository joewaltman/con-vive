import { extractBioSnippet } from '@/lib/bio-snippet';
import type { GuestFields } from '@/lib/types';

describe('extractBioSnippet', () => {
  it('returns null when no bio fields are present', () => {
    const fields: GuestFields = {};
    expect(extractBioSnippet(fields)).toBeNull();
  });

  it('prioritizes Social Summary guest_note first', () => {
    const fields: GuestFields = {
      'Social Summary': {
        guest_note: 'Tech entrepreneur building AI tools',
        inferred_role: 'Founder',
        industries: ['Technology'],
        interests: ['AI'],
        conversational_vibe: 'Engaging',
        curiosity_signals: 'High',
        source_url: 'https://linkedin.com',
        source_platform: 'linkedin',
        enriched_at: '2024-01-01',
      },
      'About': 'This should not be used',
      'What Do You Do': 'This should not be used either',
    };
    expect(extractBioSnippet(fields)).toBe('Tech entrepreneur building AI tools');
  });

  it('falls back to About when Social Summary is missing', () => {
    const fields: GuestFields = {
      'About': 'Passionate about connecting people over food',
      'What Do You Do': 'Product designer',
    };
    expect(extractBioSnippet(fields)).toBe('Passionate about connecting people over food');
  });

  it('falls back to What Do You Do when About is missing', () => {
    const fields: GuestFields = {
      'What Do You Do': 'Product designer at a startup',
      'Curious About': 'Machine learning',
    };
    expect(extractBioSnippet(fields)).toBe('Product designer at a startup');
  });

  it('falls back to Curious About when other fields are missing', () => {
    const fields: GuestFields = {
      'Curious About': 'Philosophy and cognitive science',
    };
    expect(extractBioSnippet(fields)).toBe('Philosophy and cognitive science');
  });

  it('truncates text longer than 80 characters at word boundary', () => {
    const fields: GuestFields = {
      'About': 'This is a very long bio that exceeds eighty characters and needs to be truncated at a word boundary',
    };
    const result = extractBioSnippet(fields);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(83); // 80 + "..."
    expect(result!.endsWith('...')).toBe(true);
  });

  it('does not truncate text at exactly 80 characters', () => {
    const fields: GuestFields = {
      'About': 'A'.repeat(80),
    };
    const result = extractBioSnippet(fields);
    expect(result).toBe('A'.repeat(80));
  });

  it('normalizes whitespace in the bio', () => {
    const fields: GuestFields = {
      'About': '  Multiple   spaces   and   newlines\n\nshould  be  normalized  ',
    };
    const result = extractBioSnippet(fields);
    expect(result).toBe('Multiple spaces and newlines should be normalized');
  });
});

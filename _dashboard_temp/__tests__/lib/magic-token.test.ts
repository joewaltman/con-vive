import { generateMagicToken } from '@/lib/magic-token';

describe('generateMagicToken', () => {
  it('generates a non-empty string', () => {
    const token = generateMagicToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('generates URL-safe base64 encoded tokens', () => {
    const token = generateMagicToken();
    // base64url should only contain alphanumeric, -, and _
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates tokens of consistent length', () => {
    // 32 bytes encoded as base64url = 43 characters
    const token = generateMagicToken();
    expect(token.length).toBe(43);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateMagicToken());
    }
    expect(tokens.size).toBe(100);
  });
});

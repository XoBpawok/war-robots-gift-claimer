const { maskEmail } = require('../src/logger');

describe('maskEmail', () => {
  test('masks all but first 3 chars before @', () => {
    expect(maskEmail('user@example.com')).toBe('use***@example.com');
  });

  test('handles short email (less than 3 chars before @)', () => {
    expect(maskEmail('ab@example.com')).toBe('ab***@example.com');
  });

  test('handles exactly 3 chars before @', () => {
    expect(maskEmail('abc@example.com')).toBe('abc***@example.com');
  });
});

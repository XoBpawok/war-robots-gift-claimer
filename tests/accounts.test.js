const path = require('path');
const { loadAccounts } = require('../src/accounts');

const validPath = path.join(__dirname, 'fixtures/valid-accounts.json');
const emptyPath = path.join(__dirname, 'fixtures/empty-accounts.json');
const missingPath = path.join(__dirname, 'fixtures/does-not-exist.json');

describe('loadAccounts', () => {
  test('returns array of accounts from valid file', () => {
    const accounts = loadAccounts(validPath);
    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toEqual({ email: 'user1@example.com', password: 'pass1' });
  });

  test('throws if file does not exist', () => {
    expect(() => loadAccounts(missingPath)).toThrow(/not found/i);
  });

  test('throws if accounts array is empty', () => {
    expect(() => loadAccounts(emptyPath)).toThrow(/empty/i);
  });

  test('throws if an account is missing email', () => {
    const { writeFileSync } = require('fs');
    const tmpPath = path.join(__dirname, 'fixtures/bad-accounts.json');
    writeFileSync(tmpPath, JSON.stringify([{ password: 'pass' }]));
    expect(() => loadAccounts(tmpPath)).toThrow(/email/i);
    require('fs').unlinkSync(tmpPath);
  });
});

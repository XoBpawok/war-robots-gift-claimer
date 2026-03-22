const fs = require('fs');

function loadAccounts(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`accounts.json not found at: ${filePath}`);
  }

  let accounts;
  try {
    accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`accounts.json is not valid JSON: ${e.message}`);
  }

  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('accounts.json is empty — add at least one account');
  }

  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    if (!a.email || typeof a.email !== 'string') {
      throw new Error(`Account at index ${i} is missing a valid "email" field`);
    }
    if (!a.password || typeof a.password !== 'string') {
      throw new Error(`Account at index ${i} is missing a valid "password" field`);
    }
  }

  return accounts;
}

module.exports = { loadAccounts };

const puppeteer = require('puppeteer');
const path = require('path');
const { loadAccounts } = require('./accounts');
const { log, maskEmail } = require('./logger');

const GIFTS_URL = 'https://market.my.games/games/163?content=gifts';
const ACCOUNTS_PATH = path.join(__dirname, '..', 'accounts.json');
const TIMEOUT = 30000;

async function loginAccount(page, login, password) {
  await page.goto(GIFTS_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

  // Click "Log in" button
  await page.waitForSelector('button', { timeout: TIMEOUT });
  const loginBtn = await page.evaluateHandle(() => {
    return [...document.querySelectorAll('button')].find(
      b => b.textContent.trim() === 'Log in'
    );
  });
  if (!loginBtn || !(await loginBtn.asElement())) {
    throw new Error('Could not find "Log in" button');
  }
  await loginBtn.asElement().click();

  // Fill login field (id starts with "ph-login")
  await page.waitForSelector('[id^="ph-login"]', { timeout: TIMEOUT });
  await page.type('[id^="ph-login"]', login);

  // Submit login form
  await page.keyboard.press('Enter');

  // Fill password field (id starts with "ph-password")
  await page.waitForSelector('[id^="ph-password"]', { timeout: TIMEOUT });
  await page.type('[id^="ph-password"]', password);
  await page.keyboard.press('Enter');

  // Wait for login button to disappear (confirms successful auth)
  await page.waitForFunction(
    () => ![...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Log in'),
    { timeout: TIMEOUT }
  );
}

async function countClaimButtons(page) {
  const buttons = await page.$$('button');
  let count = 0;
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), btn);
    if (text === 'Claim') count++;
  }
  return count;
}

async function claimGifts(page, maskedLogin) {
  // Wait for gift buttons to render
  await page.waitForSelector('button', { timeout: TIMEOUT });

  const total = await countClaimButtons(page);

  if (total === 0) {
    log(`[${maskedLogin}] No "Claim" buttons found — nothing to do`);
    return 0;
  }

  log(`[${maskedLogin}] Found ${total} "Claim" button(s)`);
  let claimed = 0;

  // Re-query before each click to avoid stale handles after DOM updates
  for (let i = 0; i < total; i++) {
    try {
      const buttons = await page.$$('button');
      let claimBtn = null;
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent.trim(), btn);
        if (text === 'Claim') {
          claimBtn = btn;
          break;
        }
      }
      if (!claimBtn) {
        log(`[${maskedLogin}] No more "Claim" buttons found after ${claimed} claim(s)`);
        break;
      }
      await claimBtn.click();
      log(`[${maskedLogin}] Claimed gift ${claimed + 1}/${total}`);
      // Wait for DOM to update before next iteration
      await new Promise(r => setTimeout(r, 1500));
      claimed++;
    } catch (err) {
      log(`[${maskedLogin}] ERROR on claim ${i + 1}: ${err.message}`);
    }
  }

  return claimed;
}

async function processAccount(account) {
  const masked = maskEmail(account.login);
  log(`[${masked}] Starting`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await loginAccount(page, account.login, account.password);
    log(`[${masked}] Login successful`);

    const claimed = await claimGifts(page, masked);
    log(`[${masked}] Done — claimed ${claimed} gift(s)`);
  } catch (err) {
    log(`[${masked}] ERROR: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  log('=== War Robots Gift Claimer START ===');

  let accounts;
  try {
    accounts = loadAccounts(ACCOUNTS_PATH);
  } catch (err) {
    log(`FATAL: ${err.message}`);
    process.exit(1);
  }

  log(`Loaded ${accounts.length} account(s)`);

  for (const account of accounts) {
    await processAccount(account);
  }

  log('=== War Robots Gift Claimer END ===');
}

main();

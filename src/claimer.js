const puppeteer = require('puppeteer');
const path = require('path');
const { loadAccounts } = require('./accounts');
const { log, maskEmail } = require('./logger');

const GIFTS_URL = 'https://market.my.games/games/163?content=gifts';
const ACCOUNTS_PATH = path.join(__dirname, '..', 'accounts.json');
const TIMEOUT = 30000;

async function loginAccount(page, login, password) {
  await page.goto(GIFTS_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

  await page.waitForSelector('button', { timeout: TIMEOUT });
  const loginHandle = await page.evaluateHandle(() =>
    [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Log in')
  );
  const loginBtn = loginHandle.asElement();
  if (!loginBtn) throw new Error('Could not find "Log in" button');
  await loginBtn.click();

  await page.waitForSelector('[id^="ph-login"]', { timeout: TIMEOUT });
  await page.type('[id^="ph-login"]', login);
  await page.keyboard.press('Enter');

  await page.waitForSelector('[id^="ph-password"]', { timeout: TIMEOUT });
  await page.type('[id^="ph-password"]', password);
  await page.keyboard.press('Enter');

  // Confirm auth: wait for "Log in" button to disappear
  await page.waitForFunction(
    () => ![...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Log in'),
    { timeout: TIMEOUT }
  );
}

async function claimGifts(page, maskedLogin) {
  // Login flow may have redirected away from gifts page
  await page.goto(GIFTS_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await page.waitForSelector('button', { timeout: TIMEOUT });

  let claimed = 0;

  // Re-query each iteration to avoid stale handles after DOM updates
  while (true) {
    const handle = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Free')
    );
    const claimBtn = handle.asElement();
    if (!claimBtn) break;

    try {
      await claimBtn.click();
      log(`[${maskedLogin}] Clicked Free button, waiting for modal...`);

      await page.waitForSelector('.ant-modal-body button', { timeout: TIMEOUT });
      await page.click('.ant-modal-body button');
      log(`[${maskedLogin}] Dismissed modal for gift ${claimed + 1}`);

      // Wait for modal to close before next gift
      await page.waitForFunction(
        () => !document.querySelector('.ant-modal'),
        { timeout: TIMEOUT }
      );

      claimed++;
      log(`[${maskedLogin}] Claimed gift ${claimed}`);
    } catch (err) {
      log(`[${maskedLogin}] ERROR on claim ${claimed + 1}: ${err.message}`);
      break;
    }
  }

  if (claimed === 0) log(`[${maskedLogin}] No "Free" buttons found — nothing to do`);
  return claimed;
}

async function processAccount(account) {
  const masked = maskEmail(account.login);
  log(`[${masked}] Starting`);

  const browser = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
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

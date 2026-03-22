const puppeteer = require('puppeteer');
const path = require('path');
const { loadAccounts } = require('./accounts');
const { log } = require('./logger');

const GIFTS_URL = 'https://market.my.games/games/163?content=gifts';
const ACCOUNTS_PATH = path.join(__dirname, '..', 'accounts.json');
const TIMEOUT = 30000;

// Only claim daily (100 Thorium) and weekly (500 Thorium) gifts
const CLAIMABLE_TITLES = ['100 Thorium', '500 Thorium'];

// Launches a browser with stealth settings to avoid bot detection
async function createPage() {
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

  const page = await browser.newPage();

  // Hide the webdriver flag so the site doesn't detect headless Chrome
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });

  return { browser, page };
}

// Native DOM click is required for React event handlers to fire —
// Puppeteer's simulated mouse click doesn't trigger them reliably
async function click(page, el) {
  await page.evaluate(el => el.click(), el);
}

// Finds the next unclaimed Thorium gift button on the page.
// Uses class name wildcards because the site uses hashed CSS module names (e.g. itemCard__BneJ9).
// Returns null when no claimable gifts remain.
async function findNextClaimButton(page) {
  const handle = await page.evaluateHandle(
    titles => [...document.querySelectorAll('button')].find(btn => {
      if (btn.textContent.trim() !== 'Free') return false;
      const card = btn.closest('[class*="itemCard__"]');
      const titleEl = card && card.querySelector('[class*="itemCard__title"]');
      return titleEl && titles.includes(titleEl.textContent.trim());
    }),
    CLAIMABLE_TITLES
  );
  return handle.asElement();
}

async function login(page, email, password) {
  await page.goto(GIFTS_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });

  // Find and click the "Log in" button to open the login form
  await page.waitForSelector('button', { timeout: TIMEOUT });
  const loginHandle = await page.evaluateHandle(() =>
    [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Log in')
  );
  const loginBtn = loginHandle.asElement();
  if (!loginBtn) throw new Error('Could not find "Log in" button');
  await loginBtn.click();

  await page.waitForSelector('[id^="ph-login"]', { timeout: TIMEOUT });
  await page.type('[id^="ph-login"]', email);
  await page.keyboard.press('Enter');

  await page.waitForSelector('[id^="ph-password"]', { timeout: TIMEOUT });
  await page.type('[id^="ph-password"]', password);
  await page.keyboard.press('Enter');

  // Wait for the "Log in" button to disappear — confirms successful authentication
  await page.waitForFunction(
    () => ![...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Log in'),
    { timeout: TIMEOUT }
  );
}

async function claimGifts(page, email) {
  // Navigate to gifts page (login may have redirected away)
  await page.goto(GIFTS_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await page.waitForSelector('button', { timeout: TIMEOUT });

  let claimed = 0;

  // Re-query each iteration to avoid stale handles after DOM updates
  while (true) {
    const claimBtn = await findNextClaimButton(page);
    if (!claimBtn) break;

    try {
      await click(page, claimBtn);
      log(`[${email}] Clicked Free button, waiting for confirmation modal...`);

      // Confirm the gift claim in the modal that appears
      await page.waitForSelector('.ant-modal-body button', { timeout: TIMEOUT });
      const confirmBtn = await page.$('.ant-modal-body button');
      await click(page, confirmBtn);

      // Wait for modal to close before looking for the next gift
      await page.waitForFunction(() => !document.querySelector('.ant-modal'), { timeout: TIMEOUT });

      claimed++;
      log(`[${email}] Claimed gift ${claimed}`);
    } catch (err) {
      log(`[${email}] ERROR on claim ${claimed + 1}: ${err.message}`);
      break;
    }
  }

  if (claimed === 0) log(`[${email}] No claimable Thorium gifts found`);
  return claimed;
}

async function processAccount(account) {
  const { email } = account;
  log(`[${email}] Starting`);

  const { browser, page } = await createPage();
  try {
    await login(page, email, account.password);
    log(`[${email}] Login successful`);

    const claimed = await claimGifts(page, email);
    log(`[${email}] Done — claimed ${claimed} gift(s)`);
  } catch (err) {
    log(`[${email}] ERROR: ${err.message}`);
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
  for (let i = 0; i < accounts.length; i++) {
    await processAccount(accounts[i]);

    // Random delay between accounts to avoid triggering rate limits
    if (i < accounts.length - 1) {
      const delay = 30 + Math.floor(Math.random() * 271); // random between 30s and 300s
      log(`Waiting ${delay}s before next account...`);
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
  }

  log('=== War Robots Gift Claimer END ===');
}

main();

#!/usr/bin/env node
const puppeteer = require('puppeteer');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    headless: args.includes('--headless')
  };
}

/**
 * Supports three modes:
 * - Connect to a remote Chrome via `BROWSER_WS_ENDPOINT` (WebSocket URL) or `BROWSER_URL` (HTTP devtools URL).
 * - Launch a local Chrome/Chromium using `CHROME_EXECUTABLE` if provided.
 * - Fallback to the bundled Chromium that comes with `puppeteer`.
 */
async function openFacebook({ headless = false, timeout = 15000 } = {}) {
  const defaultLaunchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1280,1024'
  ];

  // Prefer remote connection if provided
  const browserWSEndpoint = process.env.BROWSER_WS_ENDPOINT || process.env.CHROME_WS || process.env.BROWSER_WS;
  const browserURL = process.env.BROWSER_URL || process.env.CHROME_REMOTE_URL; // http://host:9222

  let browser;
  if (browserWSEndpoint || browserURL) {
    console.log('Connecting to remote Chrome...');
    const connectOpts = {};
    if (browserWSEndpoint) connectOpts.browserWSEndpoint = browserWSEndpoint;
    if (browserURL) connectOpts.browserURL = browserURL;
    browser = await puppeteer.connect(connectOpts);
  } else {
    const launchOptions = {
      headless: headless,
      args: defaultLaunchArgs,
      defaultViewport: { width: 1280, height: 1024 }
    };

    // If user provided a local Chrome executable, use it to avoid bundled Chromium
    if (process.env.CHROME_EXECUTABLE) {
      launchOptions.executablePath = process.env.CHROME_EXECUTABLE;
      console.log('Using CHROME_EXECUTABLE:', launchOptions.executablePath);
    }

    browser = await puppeteer.launch(launchOptions);
  }

  const page = await browser.newPage();

  // Optional: set a common user agent to appear like a normal browser
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36'
  );

  try {
    const url = 'https://www.facebook.com/';
    console.log(`Opening ${url} ...`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait until the email input is present (indicates the login page loaded)
    await page.waitForSelector('#email', { timeout });

    // If credentials are provided via env vars, attempt login
    const email = process.env.FB_EMAIL;
    const password = process.env.FB_PASSWORD;
    if (email && password) {
      console.log('FB_EMAIL/FB_PASSWORD found in env — attempting login...');

      // Fill form fields (attempt common selectors)
      try {
        const emailSelector = 'input[name="email"], #email';
        const passSelector = 'input[name="pass"], #pass';
        await page.waitForSelector(emailSelector, { timeout: 5000 });
        await page.focus(emailSelector);
        await page.keyboard.type(email, { delay: 50 });

        await page.waitForSelector(passSelector, { timeout: 5000 });
        await page.focus(passSelector);
        await page.keyboard.type(password, { delay: 50 });

        // Click the login button — try a few likely selectors
        const loginButtonSelectors = ['button[name="login"]', 'button[type="submit"]', 'input[type="submit"]'];
        let clicked = false;
        for (const sel of loginButtonSelectors) {
          const btn = await page.$(sel);
          if (btn) {
            await Promise.all([
              btn.click(),
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
            ]);
            clicked = true;
            break;
          }
        }

        if (!clicked) {
          // Fallback: press Enter in the password field
          await page.keyboard.press('Enter');
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        }

        // Wait a short while for login to complete or for 2FA/approval page
        await page.waitForTimeout(2000);

        // Determine whether login succeeded: email input should disappear or URL should change
        const stillHasEmail = await page.$('input[name="email"], #email');
        if (!stillHasEmail) {
          console.log('Login appears successful (email input no longer present).');
        } else {
          console.warn('Email input still present — login may have failed or additional verification required.');
        }
      } catch (loginErr) {
        console.error('Login attempt failed:', loginErr && loginErr.message ? loginErr.message : loginErr);
      }
    }

    const title = await page.title();
    const currentUrl = page.url();
    console.log('Page title:', title);
    console.log('Current URL:', currentUrl);

    // Choose screenshot name depending on whether we're logged in
    const screenshotPath = process.env.FB_EMAIL && process.env.FB_PASSWORD ? 'facebook_loggedin.png' : 'facebook_home.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);

    if (!headless && !browserWSEndpoint && !browserURL) {
      console.log('Waiting 5 seconds before closing browser...');
      await new Promise((r) => setTimeout(r, 5000));
    }
  } catch (err) {
    console.error('Error while opening Facebook:', err.message || err);
    throw err;
  } finally {
    try {
      // If we connected to a remote browser we should not forcibly close it system-wide
      if (browserWSEndpoint || browserURL) {
        await browser.disconnect();
        console.log('Disconnected from remote browser.');
      } else {
        await browser.close();
        console.log('Browser closed.');
      }
    } catch (e) {
      console.warn('Error while closing/disconnecting browser:', e && e.message ? e.message : e);
    }
  }
}

if (require.main === module) {
  const opts = parseArgs();
  openFacebook(opts).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { openFacebook };

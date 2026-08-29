import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/RadioTEDU/work/technology-test-artifacts';
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const targets = [
    { url: 'https://radiotedu.com/technology/', lang: 'en', name: 'technology-desktop', viewport: { width: 1440, height: 900 } },
    { url: 'https://radiotedu.com/technology/', lang: 'en', name: 'technology-mobile', viewport: { width: 390, height: 844 }, isMobile: true },
    { url: 'https://radiotedu.com/teknoloji/', lang: 'tr', name: 'teknoloji-desktop', viewport: { width: 1440, height: 900 } },
    { url: 'https://radiotedu.com/teknoloji/', lang: 'tr', name: 'teknoloji-mobile', viewport: { width: 390, height: 844 }, isMobile: true },
  ];

  for (const target of targets) {
    const context = await browser.newContext({
      viewport: target.viewport,
      isMobile: target.isMobile || false,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    page.on('requestfailed', req => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    const response = await page.goto(target.url + '?cache_bust=' + Date.now(), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    const title = await page.title();
    const baseHref = await page.evaluate(() => document.querySelector('base')?.getAttribute('href'));
    const isThreeReady = await page.evaluate(() => document.documentElement.classList.contains('tech-three-ready'));
    const heroCanvasExists = await page.evaluate(() => !!document.querySelector('.hero-three-canvas'));
    const signalCanvasExists = await page.evaluate(() => !!document.querySelector('.signal-story-canvas'));
    const readoutText = await page.evaluate(() => document.querySelector('[data-signal-readout]')?.textContent?.trim());
    const languageSwitchHref = await page.evaluate(() => document.querySelector('.language-switch')?.getAttribute('href'));

    // Capture hero screenshot
    const heroShotPath = path.join(ARTIFACTS_DIR, `${target.name}-hero.png`);
    const heroElem = page.locator('.hero');
    if (await heroElem.count() > 0) {
      await heroElem.screenshot({ path: heroShotPath });
    }

    // Capture signal section screenshot
    const signalShotPath = path.join(ARTIFACTS_DIR, `${target.name}-signal.png`);
    const signalElem = page.locator('.signal-story');
    if (await signalElem.count() > 0) {
      await signalElem.screenshot({ path: signalShotPath });
    }

    results.push({
      name: target.name,
      status: response?.status(),
      title,
      baseHref,
      isThreeReady,
      heroCanvasExists,
      signalCanvasExists,
      readoutText,
      languageSwitchHref,
      consoleErrors,
      failedRequests,
    });

    await context.close();
  }

  // Test language switcher transition
  const switchContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const switchPage = await switchContext.newPage();
  await switchPage.goto('https://radiotedu.com/technology/?cache_bust=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await switchPage.click('.language-switch');
  await switchPage.waitForURL('**/teknoloji/**', { timeout: 10000 });
  const trTitle = await switchPage.title();

  await switchPage.click('.language-switch');
  await switchPage.waitForURL('**/technology/**', { timeout: 10000 });
  const enTitle = await switchPage.title();

  results.push({
    name: 'language-switch-test',
    trTitle,
    enTitle,
    success: trTitle.includes('Teknoloji') && enTitle.includes('Technology'),
  });

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

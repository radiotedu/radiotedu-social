import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('artifacts/website-social-header');
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const cases = [
  { name: 'desktop', path: '/', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', path: '/', viewport: { width: 412, height: 915 } },
  { name: 'small-mobile', path: '/', viewport: { width: 320, height: 568 } },
  { name: 'english-desktop', path: '/en/', viewport: { width: 1440, height: 900 } },
  { name: 'english-mobile', path: '/en/', viewport: { width: 412, height: 915 } },
];

const report = [];

for (const entry of cases) {
  const context = await browser.newContext({ viewport: entry.viewport, locale: 'tr-TR' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await page.goto(`https://radiotedu.com${entry.path}?social-header-proof=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  await page.locator('[data-rt-cookie-reject]').first().click({ timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(900);

  const first = await page.locator('.rt-social-launch').boundingBox();
  const animationStart = await page.locator('.rt-social-launch__scene').evaluate((node) =>
    getComputedStyle(node, '::before').backgroundPositionX,
  );
  await page.waitForTimeout(900);
  const second = await page.locator('.rt-social-launch').boundingBox();
  const animationEnd = await page.locator('.rt-social-launch__scene').evaluate((node) =>
    getComputedStyle(node, '::before').backgroundPositionX,
  );

  const header = await page.evaluate(() => {
    const account = document.querySelector('.rt-account-link');
    const social = document.querySelector('.rt-social-launch');
    const menu = document.querySelector('.rt-nav-toggle');
    if (!(account instanceof HTMLElement) || !(social instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      return { missingControls: true };
    }
    const accountRect = account.getBoundingClientRect();
    const socialRect = social.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    return {
      missingControls: false,
      exactDomOrder: account.nextElementSibling === social && social.nextElementSibling === menu,
      sameSizeAsMenu: Math.abs(socialRect.width - menuRect.width) < 0.5 && Math.abs(socialRect.height - menuRect.height) < 0.5,
      visualOrder: accountRect.left < socialRect.left && socialRect.left < menuRect.left,
      href: social.getAttribute('href'),
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  await page.locator('.rt-nav-toggle').click();
  const menuSocialLinks = await page.locator('.rt-nav__list a[href*="/social"]').evaluateAll((links) => links.map((link) => ({
    text: link.textContent?.trim() || '',
    href: link.getAttribute('href') || '',
    parentClass: link.parentElement?.className || '',
  })));
  const menuContainsSocial = menuSocialLinks.length;
  const menuOpen = await page.locator('#rt-primary-nav').evaluate((node) => node.classList.contains('is-open'));
  await page.locator('.rt-nav-toggle').click();

  await page.locator('[data-rt-account-link]').click();
  await page.locator('[data-rt-account-modal]:not([hidden])').waitFor({ timeout: 10_000 });
  await page.locator('[data-rt-account-mode="kayit"]').click();
  await page.locator('[data-rt-auth="register"]').waitFor({ timeout: 10_000 });
  const registration = await page.evaluate(() => ({
    displayName: Boolean(document.querySelector('[data-rt-auth="register"] input[name="display_name"]')),
    email: Boolean(document.querySelector('[data-rt-auth="register"] input[name="email"]')),
    password: Boolean(document.querySelector('[data-rt-auth="register"] input[name="password"]')),
    consent: Boolean(document.querySelector('[data-rt-auth="register"] input[name="legal_acknowledgement"][required]')),
  }));
  await page.locator('[data-rt-auth="register"] input[name="email"]').fill('proof@example.com');
  const nonTeduAgeRequired = await page.locator('[data-rt-registration-age] input[name="age"]').isEnabled();
  await page.locator('[data-rt-auth="register"] input[name="email"]').fill('proof@tedu.edu.tr');
  const teduAgeDisabled = await page.locator('[data-rt-registration-age] input[name="age"]').isDisabled();
  await page.locator('[data-rt-account-close]').last().click();

  await page.screenshot({ path: path.join(outputDir, `${entry.name}.png`) });

  report.push({
    name: entry.name,
    status: response?.status() ?? null,
    header,
    stationaryBox: Boolean(first && second) && ['x', 'y', 'width', 'height'].every((key) => Math.abs(first[key] - second[key]) < 0.1),
    interiorAnimationChanged: animationStart !== animationEnd,
    menuOpen,
    menuContainsSocial,
    menuSocialLinks,
    registration,
    nonTeduAgeRequired,
    teduAgeDisabled,
    consoleErrors,
    pageErrors,
  });

  await context.close();
}

const reducedContext = await browser.newContext({ viewport: { width: 412, height: 915 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(`https://radiotedu.com/?social-header-reduced=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
const reducedAnimation = await reducedPage.locator('.rt-social-launch__scene').evaluate((node) => ({
  duration: getComputedStyle(node, '::before').animationDuration,
  iterations: getComputedStyle(node, '::before').animationIterationCount,
}));
await reducedContext.close();
await browser.close();

const result = { generatedAt: new Date().toISOString(), report, reducedAnimation };
await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result));

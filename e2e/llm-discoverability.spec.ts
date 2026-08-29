import { expect, request as playwrightRequest, test } from '@playwright/test';

const ORIGIN = 'https://radiotedu.com';
const crawlerUserAgents = ['ChatGPT-User', 'OAI-SearchBot', 'GPTBot'];
const publicPages = [
  { path: '/social/', canonical: `${ORIGIN}/social/` },
  { path: '/technology-new/', canonical: `${ORIGIN}/technology-new/` },
  { path: '/rtai/', canonical: `${ORIGIN}/rtai/` },
  { path: '/radioverse/', canonical: `${ORIGIN}/radioverse/` },
];

test('publishes the RadioTEDU product discovery files', async ({ request }) => {
  const robots = await request.get(`${ORIGIN}/robots.txt`);
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    'Sitemap: https://radiotedu.com/sitemap-radiotedu-products.xml',
  );

  const llms = await request.get(`${ORIGIN}/llms.txt`);
  expect(llms.status()).toBe(200);
  const llmsText = await llms.text();
  for (const page of publicPages) expect(llmsText).toContain(page.canonical);

  const sitemap = await request.get(`${ORIGIN}/sitemap-radiotedu-products.xml`);
  expect(sitemap.status()).toBe(200);
  const sitemapText = await sitemap.text();
  for (const page of publicPages) expect(sitemapText).toContain(`<loc>${page.canonical}</loc>`);
  expect(sitemapText).toContain('<loc>https://radiotedu.com/technology/</loc>');
});

for (const userAgent of crawlerUserAgents) {
  test(`${userAgent} can fetch the public product pages`, async () => {
    const context = await playwrightRequest.newContext({
      extraHTTPHeaders: { 'user-agent': userAgent },
    });

    try {
      for (const page of publicPages) {
        const response = await context.get(`${ORIGIN}${page.path}`);
        expect(response.status(), `${userAgent} ${page.path}`).toBe(200);
        const html = await response.text();
        expect(html.toLowerCase()).not.toContain('noindex');
        expect(html).toContain(page.canonical);
        expect(html).toContain('application/ld+json');
      }
    } finally {
      await context.dispose();
    }
  });
}

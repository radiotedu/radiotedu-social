import { request } from '@playwright/test';

const targets = [
  'https://radiotedu.com/llms.txt',
  `https://radiotedu.com/llms.txt?validation=${Date.now()}`,
];

const context = await request.newContext({
  extraHTTPHeaders: {
    'cache-control': 'no-cache',
    'user-agent': 'ChatGPT-User',
  },
});

const results = [];
for (const url of targets) {
  const response = await context.get(url);
  const body = await response.text();
  const headers = response.headers();
  results.push({
    url: new URL(url).search ? 'cache-busted' : 'plain',
    status: response.status(),
    technologyNew: body.includes('https://radiotedu.com/technology-new/'),
    rtai: body.includes('https://radiotedu.com/rtai/'),
    bytes: Buffer.byteLength(body),
    cache: headers['cf-cache-status'] ?? headers['x-cache'] ?? null,
    age: headers.age ?? null,
    etag: headers.etag ?? null,
    lastModified: headers['last-modified'] ?? null,
    cacheControl: headers['cache-control'] ?? null,
  });
}

await context.dispose();
console.log(JSON.stringify(results, null, 2));

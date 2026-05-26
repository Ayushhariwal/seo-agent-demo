const { chromium } = require('playwright');
const config = require('../seo-config.json');

async function crawlSite() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const visited = new Set();
  const results = [];
  const queue = [config.siteUrl];

  while (queue.length > 0 && results.length < config.maxCrawlPages) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    if (config.skipPages.some(s => url.includes(s))) continue;
    visited.add(url);

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      const statusCode = response?.status() ?? 0;

      const data = await page.evaluate(() => {
        const getMeta = (name) =>
          document.querySelector(
            `meta[name="${name}"], meta[property="${name}"]`
          )?.getAttribute('content') ?? '';

        const getJsonLd = () => {
          try {
            return Array.from(
              document.querySelectorAll('script[type="application/ld+json"]')
            ).map(s => JSON.parse(s.textContent));
          } catch { return []; }
        };

        const allLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({
            href: a.href,
            text: a.textContent.trim().substring(0, 100),
            isInternal: a.href.startsWith(window.location.origin),
            isAnchor: a.href.includes('#')
          }))
          .filter(l =>
            l.href &&
            !l.href.startsWith('mailto:') &&
            !l.href.startsWith('tel:') &&
            !l.href.startsWith('javascript:')
          );

        return {
          title: document.title,
          metaDescription: getMeta('description'),
          h1s: Array.from(document.querySelectorAll('h1'))
            .map(e => e.textContent.trim()),
          h2s: Array.from(document.querySelectorAll('h2'))
            .map(e => e.textContent.trim()).slice(0, 10),
          canonical: document.querySelector('link[rel="canonical"]')?.href ?? '',
          ogTitle: getMeta('og:title'),
          ogDescription: getMeta('og:description'),
          ogImage: getMeta('og:image'),
          robotsMeta: getMeta('robots'),
          images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            missing: !img.alt,
            filename: img.src.split('/').pop()
          })),
          allLinks,
          jsonLd: getJsonLd(),
          wordCount: document.body.innerText.trim().split(/\s+/).length,
          bodyText: document.body.innerText.trim().substring(0, 2000),
          isBlogPost: window.location.pathname.includes('/blog/') ||
                      window.location.pathname.includes('/posts/') ||
                      window.location.pathname.includes('/articles/')
        };
      });

      results.push({ url, statusCode, ...data });

      for (const link of data.allLinks) {
        if (link.isInternal && !link.isAnchor && !visited.has(link.href)) {
          queue.push(link.href);
        }
      }
    } catch (err) {
      results.push({ url, statusCode: 0, error: err.message });
    }
  }

  await browser.close();
  return results;
}

module.exports = { crawlSite };
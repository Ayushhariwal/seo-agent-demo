const { chromium } = require('playwright');

async function scrapeCompetitorPages(domains) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const domain of domains) {
    console.log(`  Scraping ${domain}...`);
    try {
      await page.goto(`https://${domain}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      const homeData = await page.evaluate(() => ({
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')
          ?.getAttribute('content') ?? '',
        h1s: Array.from(document.querySelectorAll('h1')).map(e => e.textContent.trim()),
        h2s: Array.from(document.querySelectorAll('h2')).map(e => e.textContent.trim()).slice(0, 10),
        bodyText: document.body.innerText.trim().substring(0, 3000),
        internalLinks: Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 80) }))
          .filter(l => l.href.includes(window.location.hostname))
          .slice(0, 20)
      }));

      // Scrape their top 4 internal pages
      const topPages = [];
      for (const link of homeData.internalLinks.slice(0, 4)) {
        try {
          await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 10000 });
          const pd = await page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            h1: document.querySelector('h1')?.textContent.trim() ?? '',
            h2s: Array.from(document.querySelectorAll('h2')).map(e => e.textContent.trim()).slice(0, 6),
            wordCount: document.body.innerText.trim().split(/\s+/).length,
            bodyPreview: document.body.innerText.trim().substring(0, 1200)
          }));
          topPages.push(pd);
          await page.waitForTimeout(1000);
        } catch {}
      }

      results.push({ domain, homepage: homeData, topPages });
    } catch (err) {
      console.error(`  Failed to scrape ${domain}:`, err.message);
      results.push({ domain, error: err.message });
    }

    await page.waitForTimeout(2000);
  }

  await browser.close();
  return results;
}

module.exports = { scrapeCompetitorPages };
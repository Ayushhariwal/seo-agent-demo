const { chromium } = require('playwright');
const config = require('../seo-config.json');

async function discoverCompetitors() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const discovered = new Set(config.knownCompetitors);
  const ourDomain = new URL(config.siteUrl).hostname.replace('www.', '');

  for (const keyword of config.targetKeywords.slice(0, 3)) {
    try {
      const query = encodeURIComponent(keyword);
      await page.goto(
        `https://www.google.com/search?q=${query}&num=10&hl=en`,
        { waitUntil: 'domcontentloaded', timeout: 15000 }
      );
      await page.waitForTimeout(2000);

      const domains = await page.evaluate((ourDomain) => {
        return Array.from(document.querySelectorAll('div.g a[href]'))
          .map(a => {
            try { return new URL(a.href).hostname.replace('www.', ''); }
            catch { return null; }
          })
          .filter(d => d && !d.includes('google') && d !== ourDomain)
          .slice(0, 5);
      }, ourDomain);

      for (const d of domains) discovered.add(d);
      console.log(`  Keyword "${keyword}" → found: ${domains.join(', ')}`);
    } catch (err) {
      console.error(`  SERP scrape failed for "${keyword}":`, err.message);
    }

    await page.waitForTimeout(3000);
  }

  await browser.close();
  return [...discovered].slice(0, config.maxCompetitorsToAnalyze);
}

module.exports = { discoverCompetitors };
async function checkAllLinks(pages) {
  const results = { broken: [], slow: [] };
  const checked = new Map();

  for (const page of pages) {
    for (const link of (page.allLinks ?? [])) {
      // Strip anchor fragment for HTTP check
      const url = link.href.split('#')[0];
      if (!url || checked.has(url)) continue;

      try {
        const start = Date.now();
        const res = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'SEO-Agent-Bot/1.0' }
        });
        const duration = Date.now() - start;
        checked.set(url, res.status);

        if (res.status >= 400) {
          results.broken.push({
            url, status: res.status,
            foundOn: page.url,
            linkText: link.text,
            isInternal: link.isInternal
          });
        } else if (duration > 3000) {
          results.slow.push({ url, duration, foundOn: page.url });
        }
      } catch (err) {
        checked.set(url, 'error');
        results.broken.push({
          url, status: 'error',
          foundOn: page.url,
          linkText: link.text,
          isInternal: link.isInternal,
          error: err.message
        });
      }
    }
  }

  return results;
}

module.exports = { checkAllLinks };
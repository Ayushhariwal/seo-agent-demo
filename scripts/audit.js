function auditPages(pages) {
  const issues = [];

  for (const page of pages) {
    if (page.error) {
      issues.push({ url: page.url, severity: 'critical', type: 'load_error', message: `Failed to load: ${page.error}` });
      continue;
    }
    if (page.statusCode >= 400) {
      issues.push({ url: page.url, severity: 'critical', type: 'http_error', message: `HTTP ${page.statusCode}` });
      continue;
    }

    // Title
    if (!page.title) {
      issues.push({ url: page.url, severity: 'critical', type: 'missing_title', message: 'No title tag', current: '' });
    } else if (page.title.length > 60) {
      issues.push({ url: page.url, severity: 'warning', type: 'title_long', message: `Title ${page.title.length} chars (max 60)`, current: page.title });
    } else if (page.title.length < 30) {
      issues.push({ url: page.url, severity: 'warning', type: 'title_short', message: `Title only ${page.title.length} chars (min 30)`, current: page.title });
    }

    // Meta description
    if (!page.metaDescription) {
      issues.push({ url: page.url, severity: 'critical', type: 'missing_meta', message: 'No meta description', current: '' });
    } else if (page.metaDescription.length > 155) {
      issues.push({ url: page.url, severity: 'warning', type: 'meta_long', message: `Meta ${page.metaDescription.length} chars (max 155)`, current: page.metaDescription });
    } else if (page.metaDescription.length < 70) {
      issues.push({ url: page.url, severity: 'warning', type: 'meta_short', message: `Meta only ${page.metaDescription.length} chars`, current: page.metaDescription });
    }

    // H1
    if (!page.h1s?.length) {
      issues.push({ url: page.url, severity: 'critical', type: 'missing_h1', message: 'No H1 tag' });
    } else if (page.h1s.length > 1) {
      issues.push({ url: page.url, severity: 'critical', type: 'multiple_h1', message: `${page.h1s.length} H1 tags (should be exactly 1)` });
    }

    // Canonical
    if (!page.canonical) {
      issues.push({ url: page.url, severity: 'warning', type: 'missing_canonical', message: 'No canonical tag' });
    }

    // OG tags
    if (!page.ogTitle) issues.push({ url: page.url, severity: 'info', type: 'missing_og_title', message: 'No og:title' });
    if (!page.ogDescription) issues.push({ url: page.url, severity: 'info', type: 'missing_og_desc', message: 'No og:description' });
    if (!page.ogImage) issues.push({ url: page.url, severity: 'info', type: 'missing_og_image', message: 'No og:image' });

    // Images
    const missingAlts = page.images?.filter(i => i.missing) ?? [];
    if (missingAlts.length > 0) {
      issues.push({
        url: page.url, severity: 'warning', type: 'missing_alt',
        message: `${missingAlts.length} image(s) missing alt text`,
        images: missingAlts
      });
    }

    // Schema
    if (!page.jsonLd?.length) {
      issues.push({ url: page.url, severity: 'info', type: 'missing_schema', message: 'No JSON-LD schema markup' });
    }

    // Thin content — blogs need more words
    const minWords = page.isBlogPost ? 600 : 300;
    if (page.wordCount && page.wordCount < minWords) {
      issues.push({ url: page.url, severity: 'warning', type: 'thin_content', message: `Only ${page.wordCount} words (min ${minWords})` });
    }

    // noindex
    if (page.robotsMeta?.includes('noindex')) {
      issues.push({ url: page.url, severity: 'critical', type: 'noindex', message: 'noindex tag — Google will not index this page' });
    }
  }

  return issues;
}

function scoreIssues(issues) {
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'critical') score -= 10;
    else if (i.severity === 'warning') score -= 3;
    else if (i.severity === 'info') score -= 1;
  }
  return Math.max(0, score);
}

module.exports = { auditPages, scoreIssues };
const fs = require('fs');
const path = require('path');
const { crawlSite } = require('./crawler');
const { auditPages, scoreIssues } = require('./audit');
const { checkAllLinks } = require('./link-checker');
const { aiCallJSON } = require('./ai-client');
const { applyAllFixes } = require('./file-patcher');
const { checkAndRevertBadFiles } = require('./syntax-check');
const { commitAndPush } = require('./git-push');
const config = require('../seo-config.json');

async function getSEOSuggestions(issues, pages) {
  const fixableTypes = [
    'missing_title', 'title_long', 'title_short',
    'missing_meta', 'meta_long', 'meta_short',
    'missing_h1', 'missing_alt'
  ];
  const fixable = issues.filter(i => fixableTypes.includes(i.type));
  if (!fixable.length) return [];

  const byPage = {};
  for (const issue of fixable) {
    if (!byPage[issue.url]) byPage[issue.url] = [];
    byPage[issue.url].push(issue);
  }

  const suggestions = [];

  for (const [url, pageIssues] of Object.entries(byPage)) {
    const page = pages.find(p => p.url === url);
    if (!page) continue;

    const prompt = `You are an SEO and GEO expert. Fix these issues for a Next.js ${page.isBlogPost ? 'blog post' : 'page'}.

URL: ${url}
Current title: ${page.title || 'MISSING'}
Current meta: ${page.metaDescription || 'MISSING'}
Current H1: ${page.h1s?.[0] || 'MISSING'}
H2s: ${page.h2s?.slice(0, 5).join(' | ') || 'none'}
Word count: ${page.wordCount}
Content preview: ${page.bodyText?.substring(0, 500) || 'unavailable'}
Missing alt images: ${page.images?.filter(i => i.missing).map(i => i.filename).join(', ') || 'none'}

Issues: ${pageIssues.map(i => i.type + ': ' + i.message).join(' | ')}

Return JSON:
{
  "suggested_title": "50-60 chars, keyword near start",
  "suggested_meta": "140-155 chars, action-oriented with keyword",
  "suggested_h1": "clear H1 matching the page topic",
  "geo_intro": "2-sentence definition-first intro so AI search engines cite this page",
  "alt_texts": { "filename.jpg": "descriptive alt text" },
  "schema_type": "WebPage|Article|BlogPosting|FAQPage|Service|LocalBusiness",
  "reasoning": "one sentence summary of changes"
}`;

    try {
      const { result, provider } = await aiCallJSON(
        prompt,
        'You are an SEO expert. Return only valid JSON.',
        'haiku' // Haiku for daily per-page tasks
      );
      suggestions.push({ url, ...result, issues: pageIssues });
      console.log(`  Suggestions for ${url} via ${provider}`);
    } catch (err) {
      console.error(`  Suggestion failed for ${url}:`, err.message);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return suggestions;
}

async function run() {
  const date = new Date().toISOString().split('T')[0];
  console.log(`\n=== Daily SEO Agent: ${date} ===\n`);

  console.log('Step 1: Crawling site...');
  const pages = await crawlSite();
  console.log(`  ${pages.length} pages crawled`);

  console.log('Step 2: Running SEO audit...');
  const issues = auditPages(pages);
  const score = scoreIssues(issues);
  const criticals = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  console.log(`  Score: ${score}/100 | Critical: ${criticals.length} | Warnings: ${warnings.length}`);

  console.log('Step 3: Checking all links...');
  const linkResults = await checkAllLinks(pages);
  console.log(`  Broken: ${linkResults.broken.length} | Slow: ${linkResults.slow.length}`);

  console.log('Step 4: Getting AI suggestions (Claude Haiku → Groq fallback)...');
  const suggestions = await getSEOSuggestions(issues, pages);
  console.log(`  ${suggestions.length} pages need fixes`);

  let patchResults = [];
  if (suggestions.length > 0) {
    console.log('Step 5: Patching files (Claude Sonnet → Groq fallback)...');
    patchResults = await applyAllFixes(suggestions);
    const patched = patchResults.filter(r => r.patched).length;
    console.log(`  ${patched} files patched`);

    console.log('Step 6: Syntax check...');
    const allValid = checkAndRevertBadFiles(patchResults);
    console.log(`  Syntax check: ${allValid ? 'all passed' : 'some files reverted'}`);
  }

  console.log('Step 7: Saving report...');
  const reportDir = path.join(process.cwd(), 'seo-reports', 'daily');
  fs.mkdirSync(reportDir, { recursive: true });

  let report = `# Daily SEO Report — ${date}\n\n`;
  report += `**Score: ${score}/100** | Critical: ${criticals.length} | Warnings: ${warnings.length} | Pages crawled: ${pages.length}\n\n`;
  report += `**Links** | Broken: ${linkResults.broken.length} | Slow (>3s): ${linkResults.slow.length}\n\n`;

  if (criticals.length) {
    report += `## Critical issues\n\n`;
    for (const i of criticals) report += `- \`${i.url}\` — ${i.message}\n`;
    report += '\n';
  }
  if (warnings.length) {
    report += `## Warnings\n\n`;
    for (const i of warnings) report += `- \`${i.url}\` — ${i.message}\n`;
    report += '\n';
  }
  if (linkResults.broken.length) {
    report += `## Broken / dead links\n\n`;
    for (const b of linkResults.broken) {
      report += `- **[${b.status}]** \`${b.url}\`\n`;
      report += `  Found on: \`${b.foundOn}\` | Link text: "${b.linkText}" | Internal: ${b.isInternal}\n`;
    }
    report += '\n';
  }
  if (patchResults.filter(r => r.patched).length) {
    report += `## Files auto-patched\n\n`;
    for (const p of patchResults.filter(r => r.patched)) {
      report += `- \`${p.filePath}\` via ${p.provider}\n`;
      for (const c of (p.changes ?? [])) report += `  - ${c}\n`;
    }
    report += '\n';
  }
  if (patchResults.filter(r => r.reverted).length) {
    report += `## Files reverted (syntax error caught)\n\n`;
    for (const p of patchResults.filter(r => r.reverted)) {
      report += `- \`${p.filePath}\` — ${p.revertReason}\n`;
    }
  }

  fs.writeFileSync(path.join(reportDir, `${date}.md`), report);

  console.log('Step 8: Pushing to branch...');
  if (process.env.GITHUB_REPOSITORY) {
    await commitAndPush(`Daily SEO auto-fix ${date} — Score: ${score}/100`);
  }

  console.log(`\n=== Daily complete. Score: ${score}/100 ===\n`);
}

run().catch(err => { console.error(err); process.exit(1); });
const fs = require('fs');
const path = require('path');
const { crawlSite } = require('./crawler');
const { discoverCompetitors } = require('./competitor-discovery');
const { scrapeCompetitorPages } = require('./competitor-scraper');
const { getGSCData, analyzeGaps } = require('./keyword-gap');
const { writeBlogPosts } = require('./blog-writer');
const { aiCall } = require('./ai-client');
const { commitAndPush } = require('./git-push');
const config = require('../seo-config.json');

async function run() {
  const date = new Date().toISOString().split('T')[0];
  console.log(`\n=== Weekly SEO Agent: ${date} ===\n`);

  console.log('Step 1: Crawling our site...');
  const ourPages = await crawlSite();
  console.log(`  ${ourPages.length} pages`);

  console.log('Step 2: Discovering competitors...');
  const competitors = await discoverCompetitors();
  console.log(`  Analyzing: ${competitors.join(', ')}`);

  console.log('Step 3: Scraping competitor content...');
  const competitorData = await scrapeCompetitorPages(competitors);

  console.log('Step 4: Fetching GSC data...');
  const gscData = await getGSCData();
  console.log(`  ${Object.keys(gscData).length} keywords in GSC`);

  console.log('Step 5: Analyzing gaps (Claude Haiku → Groq fallback)...');
  const gaps = await analyzeGaps(competitorData, gscData, ourPages);
  console.log(`  Missing topics: ${gaps.missingTopics?.length} | Blog ideas: ${gaps.blogPostIdeas?.length}`);

  console.log('Step 6: Writing blog posts (Claude Sonnet → Groq fallback)...');
  const blogPosts = await writeBlogPosts(gaps.blogPostIdeas ?? []);
  const published = blogPosts.filter(b => b.published).length;
  const drafted = blogPosts.filter(b => !b.published).length;
  console.log(`  ${published} published, ${drafted} saved to content-drafts/`);

  console.log('Step 7: Writing weekly summary (Claude Sonnet → Groq fallback)...');
  const quickWins = Object.entries(gscData)
    .map(([k, d]) => ({ keyword: k, ...d }))
    .filter(k => k.position >= 4 && k.position <= 20 && k.impressions > 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8);

  const summaryPrompt = `Write a concise internal SEO weekly summary.

Our quick win keywords (pos 4-20 — almost page 1):
${quickWins.map(k => `- "${k.keyword}" pos ${Math.round(k.position)}, ${k.impressions} impressions, ${k.clicks} clicks`).join('\n') || 'None yet'}

Content gaps found vs competitors (${competitors.join(', ')}):
${gaps.missingTopics?.slice(0, 6).map(t => `- ${t.topic}: ${t.why} [${t.priority}]`).join('\n') || 'None found'}

Blog posts written:
${blogPosts.map(b => `- "${b.filename}" (${b.published ? 'published live' : 'draft — set autoPublishBlogs:true to auto-publish'})`).join('\n') || 'None this week'}

Write 4 bullet points only:
1. Biggest opportunity this week (be specific)
2. Top 2 quick win keywords — exact action for each
3. Best new content to create — specific title and why
4. One thing to monitor or watch

Max 2 sentences per bullet. No fluff. Write for a small technical team.`;

  const { result: summary, provider: summaryProvider } = await aiCall(
    summaryPrompt,
    'You are a concise SEO analyst writing for an internal team.',
    'sonnet'
  );
  console.log(`  Summary via ${summaryProvider}`);

  console.log('Step 8: Saving weekly report...');
  const reportDir = path.join(process.cwd(), 'seo-reports', 'weekly');
  fs.mkdirSync(reportDir, { recursive: true });

  let report = `# Weekly SEO Report — ${date}\n\n`;
  report += `## Summary\n\n${summary}\n\n---\n\n`;
  report += `## Competitors analyzed\n\n${competitors.map(c => `- ${c}`).join('\n')}\n\n`;

  report += `## Keyword gaps — topics we are missing\n\n`;
  report += `| Topic | Why | Target keyword | Priority |\n|---|---|---|---|\n`;
  for (const t of (gaps.missingTopics ?? [])) {
    report += `| ${t.topic} | ${t.why} | \`${t.suggestedKeyword}\` | **${t.priority}** |\n`;
  }

  report += `\n## Quick wins — our keywords near page 1\n\n`;
  report += `| Keyword | Position | Impressions | Clicks | Page |\n|---|---|---|---|---|\n`;
  for (const k of quickWins) {
    report += `| ${k.keyword} | ${Math.round(k.position)} | ${k.impressions} | ${k.clicks} | ${k.page} |\n`;
  }

  report += `\n## Blog posts this week\n\n`;
  for (const b of blogPosts) {
    const status = b.published ? '✅ Live on site' : '📝 In content-drafts/ (set autoPublishBlogs:true to publish automatically)';
    report += `- **${b.filename}** — ${status} — written via ${b.provider}\n`;
  }
  if (blogPosts.length === 0) {
    report += `No high-priority blog ideas found this week.\n`;
  }

  report += `\n## Improvement opportunities\n\n`;
  for (const t of (gaps.improvementTopics ?? [])) {
    report += `- **${t.topic}** — ${t.action}\n`;
  }

  fs.writeFileSync(path.join(reportDir, `${date}.md`), report);

  console.log('Step 9: Pushing to branch...');
  if (process.env.GITHUB_REPOSITORY) {
    await commitAndPush(
      `Weekly SEO update ${date} — ${blogPosts.length} posts, ${gaps.missingTopics?.length ?? 0} gaps`
    );
  }

  console.log('\n=== Weekly agent complete ===\n');
}

run().catch(err => { console.error(err); process.exit(1); });
const fs = require('fs');
const path = require('path');
const { aiCallJSON } = require('./ai-client');
const config = require('../seo-config.json');

function findSourceFile(pageUrl) {
  const urlPath = pageUrl.replace(config.siteUrl, '').split('?')[0] || '/';

  const candidates = [
    // App router
    `src/app${urlPath}/page.tsx`,
    `src/app${urlPath}/page.jsx`,
    `src/app${urlPath}/page.js`,
    `app${urlPath}/page.tsx`,
    `app${urlPath}/page.jsx`,
    // Pages router
    `src/pages${urlPath}.tsx`,
    `src/pages${urlPath}.jsx`,
    `src/pages${urlPath}/index.tsx`,
    `pages${urlPath}.tsx`,
    `pages${urlPath}/index.tsx`,
    // Homepage special cases
    urlPath === '/' ? 'src/app/page.tsx' : null,
    urlPath === '/' ? 'src/app/page.jsx' : null,
    urlPath === '/' ? 'src/pages/index.tsx' : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const full = path.join(process.cwd(), candidate);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function patchFile(filePath, suggestion) {
  const original = fs.readFileSync(filePath, 'utf8');

  const prompt = `You are a senior Next.js developer. Apply ONLY the SEO metadata changes below to this file.

CURRENT FILE (${path.basename(filePath)}):
\`\`\`
${original.substring(0, 5000)}
\`\`\`

CHANGES TO APPLY:
- New title: "${suggestion.suggested_title}"
- New meta description: "${suggestion.suggested_meta}"
- New H1 text: "${suggestion.suggested_h1}"
- GEO intro rewrite: "${suggestion.geo_intro}"

RULES — follow these exactly:
1. App Router with "export const metadata": update title and description fields only
2. App Router with "generateMetadata": update the returned title and description only
3. Pages Router with <Head>: update <title> and <meta name="description"> only
4. If H1 is a hardcoded string in JSX, update the text only
5. Do NOT change imports, component logic, styling, props, or any other code
6. Do NOT add new imports
7. Return the COMPLETE file — every single line, unchanged except the metadata

Return JSON:
{
  "updatedContent": "complete file content here",
  "changesApplied": ["description of change 1", "description of change 2"]
}`;

  try {
    const { result, provider } = await aiCallJSON(
      prompt,
      'You are a Next.js developer. Return only valid JSON with the complete updated file.',
      'sonnet' // Always use Sonnet for code changes
    );

    if (!result.updatedContent) {
      return { patched: false, reason: 'AI returned no content' };
    }

    if (result.updatedContent === original) {
      return { patched: false, reason: 'No changes needed' };
    }

    fs.writeFileSync(filePath, result.updatedContent);
    console.log(`  Patched via ${provider}: ${path.basename(filePath)}`);
    console.log(`  Changes: ${result.changesApplied?.join(' | ')}`);
    return { patched: true, changes: result.changesApplied, provider };
  } catch (err) {
    console.error(`  Patch failed for ${filePath}:`, err.message);
    return { patched: false, error: err.message };
  }
}

async function applyAllFixes(suggestions) {
  const results = [];

  for (const suggestion of suggestions) {
    const filePath = findSourceFile(suggestion.url);
    if (!filePath) {
      console.log(`  No source file found for: ${suggestion.url}`);
      results.push({ url: suggestion.url, patched: false, reason: 'Source file not found' });
      continue;
    }

    const result = await patchFile(filePath, suggestion);
    results.push({ url: suggestion.url, filePath, ...result });
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

module.exports = { applyAllFixes };
const { google } = require('googleapis');
const { aiCallJSON, aiCall } = require('./ai-client');
const config = require('../seo-config.json');

async function getGSCData() {
  console.log('  Fetching GSC keyword data...');
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GSC_CLIENT_EMAIL,
      private_key: process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });

  const webmasters = google.searchconsole({ version: 'v1', auth });
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date(today - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: config.gscSiteUrl,
      requestBody: {
        startDate, endDate,
        dimensions: ['query', 'page'],
        rowLimit: 500
      }
    });

    const gscMap = {};
    for (const row of (res.data.rows ?? [])) {
      gscMap[row.keys[0]] = {
        page: row.keys[1],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position
      };
    }
    return gscMap;
  } catch (err) {
    console.error('  GSC error:', err.message);
    return {};
  }
}

async function analyzeGaps(competitorData, gscData, ourPages) {
  console.log('  Analyzing gaps with Claude Haiku...');

  const ourKeywords = Object.keys(gscData).slice(0, 60).join(', ');
  const ourTopics = ourPages.map(p => p.title).filter(Boolean).slice(0, 20).join(' | ');

  const competitorSummary = competitorData
    .filter(c => !c.error)
    .map(c => {
      const topics = [
        c.homepage?.title,
        ...(c.homepage?.h2s ?? []),
        ...(c.topPages ?? []).map(p => p.h1)
      ].filter(Boolean).join(', ');
      return `${c.domain}: ${topics}`;
    }).join('\n');

  const prompt = `You are an SEO analyst. Find keyword and content gaps between our website and competitors.

OUR keywords (from Google Search Console):
${ourKeywords || 'No GSC data yet — site may be new'}

OUR page topics:
${ourTopics}

COMPETITOR content:
${competitorSummary}

Return JSON with this exact structure:
{
  "missingTopics": [
    {
      "topic": "topic name",
      "why": "why this matters for our site",
      "suggestedKeyword": "exact keyword to target",
      "priority": "high"
    }
  ],
  "improvementTopics": [
    {
      "topic": "topic name",
      "ourPage": "our page URL if known",
      "action": "specific action to take"
    }
  ],
  "quickWins": [
    {
      "keyword": "keyword",
      "currentPosition": "estimated position",
      "action": "what to do"
    }
  ],
  "blogPostIdeas": [
    {
      "title": "exact blog post title",
      "targetKeyword": "primary keyword",
      "angle": "what makes this post better than competitors",
      "priority": "high"
    }
  ]
}`;

  const { result, provider } = await aiCallJSON(
    prompt,
    'You are an expert SEO analyst. Return only valid JSON.',
    'haiku'
  );
  console.log(`  Gap analysis done via ${provider}`);
  return result;
}

module.exports = { getGSCData, analyzeGaps };
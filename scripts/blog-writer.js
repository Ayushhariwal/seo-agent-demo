const fs = require('fs');
const path = require('path');
const { aiCall } = require('./ai-client');
const config = require('../seo-config.json');

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 60);
}

async function writeBlogPost(idea) {
  console.log(`  Writing: "${idea.title}"...`);

  const today = new Date().toISOString().split('T')[0];

  const prompt = `Write a complete, high-quality SEO and GEO optimized blog post.

Title: ${idea.title}
Target keyword: ${idea.targetKeyword}
Content angle: ${idea.angle}
Site context: ${config.siteUrl}
Date: ${today}

Requirements:
- Length: 900-1200 words
- Structure: Introduction (150 words) → 4-5 H2 sections → Conclusion with CTA
- First paragraph: definition-first format answering the keyword directly (GEO-optimized — AI engines like Perplexity and ChatGPT cite pages that answer questions immediately in the first 2 sentences)
- Include target keyword naturally 4-6 times — never stuff it
- Tone: expert and helpful, not salesy
- Include at least one practical tip or example per section
- Conclusion: clear next step or CTA relevant to the site

Return the COMPLETE blog post in this exact MDX format — nothing else:

---
title: "${idea.title}"
description: "150-char meta description with keyword"
date: "${today}"
tags: ["tag1", "tag2", "tag3"]
---

# ${idea.title}

[full content here in clean markdown]`;

  const { result, provider } = await aiCall(
    prompt,
    'You are an expert content writer specializing in SEO and GEO-optimized blog posts. Write complete, publish-ready content only.',
    'sonnet' // Always Sonnet for blog writing
  );

  const slug = generateSlug(idea.title);

  let filePath;
  if (config.autoPublishBlogs) {
    // App Router structure: app/blog/[slug]/page.mdx  — picked up as /blog/[slug]
    const postDir = path.join(process.cwd(), config.blogDirectory, slug);
    fs.mkdirSync(postDir, { recursive: true });
    filePath = path.join(postDir, 'page.mdx');
  } else {
    // Draft: flat file in content-drafts/ for human review before publishing
    const filename = `${today}-${slug}.mdx`;
    const destDir = path.join(process.cwd(), 'content-drafts');
    fs.mkdirSync(destDir, { recursive: true });
    filePath = path.join(destDir, filename);
  }

  fs.writeFileSync(filePath, result);

  const status = config.autoPublishBlogs ? 'PUBLISHED → app/blog/' + slug + '/page.mdx' : 'DRAFT → content-drafts/';
  console.log(`  [${status}] via ${provider}`);

  return {
    slug, filePath,
    published: config.autoPublishBlogs,
    provider
  };
}

async function writeBlogPosts(ideas) {
  const toWrite = ideas
    .filter(i => i.priority === 'high')
    .slice(0, config.maxBlogPostsPerWeek);

  const posts = [];
  for (const idea of toWrite) {
    try {
      const post = await writeBlogPost(idea);
      if (post) posts.push(post);
    } catch (err) {
      console.error(`  Blog write failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  return posts;
}

module.exports = { writeBlogPosts };
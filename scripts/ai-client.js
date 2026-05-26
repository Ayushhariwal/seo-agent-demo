/**
 * AI Client — Claude primary, Groq automatic fallback
 *
 * claudeHaiku  → daily tasks: SEO rewrites, analysis, suggestions
 * claudeSonnet → blog writing, file patching, weekly summary
 * groq         → automatic fallback if any Claude call fails
 */

const config = require('../seo-config.json');

// ─── Claude ──────────────────────────────────────────────────────────

async function callClaude(prompt, systemPrompt = '', model = 'haiku') {
  const modelId = model === 'sonnet'
    ? config.claudeSonnetModel
    : config.claudeHaikuModel;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'user', content: systemPrompt });
    messages.push({ role: 'assistant', content: 'Understood.' });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 2000,
      messages
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`Claude error: ${data.error.message}`);
  return data.content[0].text;
}

async function callClaudeJSON(prompt, systemPrompt = '', model = 'haiku') {
  const raw = await callClaude(prompt, systemPrompt, model);
  try {
    // Strip any markdown fences Claude might add
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.substring(0, 200)}`);
  }
}

// ─── Groq fallback ───────────────────────────────────────────────────

async function callGroq(prompt, systemPrompt = '') {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages,
      temperature: 0.2,
      max_tokens: 2000
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`Groq error: ${data.error.message}`);
  return data.choices[0].message.content;
}

async function callGroqJSON(prompt, systemPrompt = '') {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`Groq error: ${data.error.message}`);
  return JSON.parse(data.choices[0].message.content);
}

// ─── Public API — with automatic fallback ────────────────────────────

/**
 * Call AI with automatic fallback.
 * model: 'haiku' | 'sonnet'
 * Returns plain text.
 */
async function aiCall(prompt, systemPrompt = '', model = 'haiku') {
  try {
    const result = await callClaude(prompt, systemPrompt, model);
    return { result, provider: `claude-${model}` };
  } catch (claudeErr) {
    console.warn(`  Claude ${model} failed: ${claudeErr.message}`);
    console.warn('  Falling back to Groq...');
    try {
      const result = await callGroq(prompt, systemPrompt);
      return { result, provider: 'groq-fallback' };
    } catch (groqErr) {
      throw new Error(
        `Both Claude and Groq failed.\nClaude: ${claudeErr.message}\nGroq: ${groqErr.message}`
      );
    }
  }
}

/**
 * Call AI expecting JSON response with automatic fallback.
 * model: 'haiku' | 'sonnet'
 * Returns parsed object.
 */
async function aiCallJSON(prompt, systemPrompt = '', model = 'haiku') {
  try {
    const result = await callClaudeJSON(prompt, systemPrompt, model);
    return { result, provider: `claude-${model}` };
  } catch (claudeErr) {
    console.warn(`  Claude ${model} JSON failed: ${claudeErr.message}`);
    console.warn('  Falling back to Groq JSON...');
    try {
      const result = await callGroqJSON(prompt, systemPrompt);
      return { result, provider: 'groq-fallback' };
    } catch (groqErr) {
      throw new Error(
        `Both Claude and Groq failed.\nClaude: ${claudeErr.message}\nGroq: ${groqErr.message}`
      );
    }
  }
}

module.exports = { aiCall, aiCallJSON };
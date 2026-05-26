const config = require('../seo-config.json');

async function callGroq(prompt, systemPrompt = '') {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
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
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
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
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(`Groq error: ${data.error.message}`);

  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error('Groq did not return valid JSON');
  }
}

// model param ('haiku' or 'sonnet') is accepted but ignored
// Groq handles everything in testing mode
async function aiCall(prompt, systemPrompt = '', model = 'haiku') {
  console.log(`  [AI] Groq (${config.groqModel})...`);
  const result = await callGroq(prompt, systemPrompt);
  return { result, provider: 'groq' };
}

async function aiCallJSON(prompt, systemPrompt = '', model = 'haiku') {
  console.log(`  [AI] Groq JSON (${config.groqModel})...`);
  const result = await callGroqJSON(prompt, systemPrompt);
  return { result, provider: 'groq' };
}

module.exports = { aiCall, aiCallJSON };
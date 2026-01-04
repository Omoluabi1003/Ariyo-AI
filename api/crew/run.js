const { sql } = require('@vercel/postgres');
const { ensureSchema, getBrandVault } = require('./db');
const { TOOL_DEFINITIONS, runTool } = require('./tools');
const { SESSION_COOKIE, decodeSession, parseCookies } = require('../auth/utils');

const AGENT_PROMPTS = {
  Beacon: 'You are Beacon, a content strategist. Clarify the core narrative, campaign goals, and positioning.',
  Courier: 'You are Courier, an email and newsletter specialist. Focus on lifecycle messaging and crisp copy.',
  Atlas: 'You are Atlas, a lead and outreach strategist. Focus on prospecting and conversion enablement.',
  Scribe: 'You are Scribe, a blog and SEO strategist. Focus on search intent and content structure.',
  Analyst: 'You are Analyst, an insights and reporting specialist. Focus on metrics, insights, and recommendations.'
};

function requireAuth(req, res) {
  const cookies = parseCookies(req);
  const session = decodeSession(cookies[SESSION_COOKIE]);
  if (!session) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return null;
  }
  return session;
}

function buildSystemPrompt(agent, vault) {
  return `You are part of the Ariyo AI Crew Console.\n\n${AGENT_PROMPTS[agent] || ''}\n\nBrand Vault:\n- Voice: ${vault.voice}\n- Bio: ${vault.bio}\n- Services: ${vault.services}\n- Audience: ${vault.audience}\n- CTAs: ${vault.ctas}\n- Hashtags: ${vault.hashtags}\n- Tone: ${vault.tone}\n\nOutput format: Markdown with the exact section headings:\n## Summary\n## Deliverables\n## Next Actions\n## Risks\nOptionally include a JSON payload in a fenced code block (```json). Do not auto-post anywhere. Provide clear, actionable outputs.`;
}

async function callOpenAI(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'OpenAI request failed');
  }

  return response;
}

function extractJsonPayload(markdown) {
  const match = markdown.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    return { error: 'Invalid JSON payload' };
  }
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    let runId = null;
    try {
      const payload = JSON.parse(body || '{}');
      const { agent, goal, context } = payload;

      if (!agent || !goal) {
        res.statusCode = 400;
        res.end('Missing agent or goal');
        return;
      }

      await ensureSchema();
      const vault = await getBrandVault();

      const insert = await sql.query(
        'INSERT INTO crew_runs (agent, goal, context, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [agent, goal, context || '', 'running']
      );
      runId = insert.rows[0].id;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      });

      res.write(`data: ${JSON.stringify({ type: 'meta', runId })}\n\n`);

      const systemPrompt = buildSystemPrompt(agent, vault);
      const userPrompt = `Goal: ${goal}\nContext: ${context || 'N/A'}`;
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

      const toolResponse = await callOpenAI({
        model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto'
      });
      const toolData = await toolResponse.json();
      const toolCalls = toolData.choices?.[0]?.message?.tool_calls || [];

      if (toolCalls.length) {
        messages.push({
          role: 'assistant',
          content: toolData.choices?.[0]?.message?.content || '',
          tool_calls: toolCalls
        });

        for (const call of toolCalls) {
          const name = call.function?.name;
          const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
          const result = runTool(name, args);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name,
            content: JSON.stringify(result)
          });
        }
      }

      const streamResponse = await callOpenAI({
        model,
        messages,
        stream: true
      });

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.replace(/^data:\s*/, '');
          if (data === '[DONE]') {
            break;
          }

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              res.write(`data: ${JSON.stringify({ type: 'token', value: delta })}\n\n`);
            }
          } catch (error) {
            // ignore parsing errors
          }
        }
      }

      const outputJson = extractJsonPayload(fullText);
      await sql.query(
        'UPDATE crew_runs SET output_markdown = $1, output_json = $2, status = $3 WHERE id = $4',
        [fullText, outputJson, 'completed', runId]
      );

      res.write(`data: ${JSON.stringify({ type: 'done', runId, outputJson })}\n\n`);
      res.end();
    } catch (error) {
      console.error(error);
      if (runId) {
        await sql.query('UPDATE crew_runs SET status = $1 WHERE id = $2', ['error', runId]);
      }
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Crew run failed');
        return;
      }
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  });
};

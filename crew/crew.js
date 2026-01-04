const CREW_AGENTS = [
  {
    id: 'Beacon',
    role: 'Content Strategist',
    summary: 'Clarifies campaign goals, positioning, and brand-aligned story arcs.'
  },
  {
    id: 'Courier',
    role: 'Email & Newsletter',
    summary: 'Builds lifecycle emails, newsletters, and launch announcements.'
  },
  {
    id: 'Atlas',
    role: 'Lead & Outreach',
    summary: 'Targets prospects, outreach sequences, and sales enablement.'
  },
  {
    id: 'Scribe',
    role: 'Blog & SEO',
    summary: 'Shapes search-optimized content, outlines, and editorial plans.'
  },
  {
    id: 'Analyst',
    role: 'Insights & Reporting',
    summary: 'Summarizes performance, reporting, and analytics narratives.'
  }
];

const AGENT_OPTIONS = CREW_AGENTS.map(agent => `<option value="${agent.id}">${agent.id} — ${agent.role}</option>`).join('');

const $ = (selector, scope = document) => scope.querySelector(selector);

function formatDate(isoString) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? isoString : date.toLocaleString();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

async function getSession() {
  try {
    return await fetchJson('/api/auth/session');
  } catch (error) {
    return null;
  }
}

async function requireCrewAuth() {
  const gate = $('#authGate');
  const session = await getSession();
  if (!gate) return session;

  if (session) {
    gate.classList.add('auth-hidden');
    gate.setAttribute('aria-hidden', 'true');
    return session;
  }

  gate.classList.remove('auth-hidden');
  gate.setAttribute('aria-hidden', 'false');
  return null;
}

function mountRoster() {
  const roster = $('#agentRoster');
  if (!roster) return;
  roster.innerHTML = CREW_AGENTS.map(agent => `
    <article class="crew-card">
      <span class="role-pill">${agent.role}</span>
      <h3>${agent.id}</h3>
      <p>${agent.summary}</p>
      <a class="secondary-button" href="/crew/run/?agent=${encodeURIComponent(agent.id)}">Run ${agent.id}</a>
    </article>
  `).join('');
}

function mountAgentSelect() {
  const select = $('#agentSelect');
  if (!select) return;
  select.innerHTML = AGENT_OPTIONS;
  const urlAgent = new URLSearchParams(window.location.search).get('agent');
  if (urlAgent) {
    select.value = urlAgent;
  }
}

function parseStructuredOutput(markdown) {
  const sections = {
    Summary: '',
    Deliverables: '',
    'Next Actions': '',
    Risks: ''
  };

  for (const key of Object.keys(sections)) {
    const pattern = new RegExp(`##\\s*${key}([\\s\\S]*?)(?=##\\s|$)`, 'i');
    const match = markdown.match(pattern);
    if (match) {
      sections[key] = match[1].trim();
    }
  }

  const jsonMatch = markdown.match(/```json\s*([\s\S]*?)```/i);
  let payload = null;
  if (jsonMatch) {
    try {
      payload = JSON.parse(jsonMatch[1]);
    } catch (error) {
      payload = { error: 'Invalid JSON payload' };
    }
  }

  return { sections, payload };
}

function updateOutputPanels(markdown, payload) {
  const { sections } = parseStructuredOutput(markdown);
  const summaryEl = $('#summaryOutput');
  const deliverablesEl = $('#deliverablesOutput');
  const actionsEl = $('#actionsOutput');
  const risksEl = $('#risksOutput');
  const payloadEl = $('#jsonOutput');

  if (summaryEl) summaryEl.textContent = sections.Summary || 'Awaiting summary.';
  if (deliverablesEl) deliverablesEl.textContent = sections.Deliverables || 'Awaiting deliverables.';
  if (actionsEl) actionsEl.textContent = sections['Next Actions'] || 'Awaiting next actions.';
  if (risksEl) risksEl.textContent = sections.Risks || 'Awaiting risks.';
  if (payloadEl) payloadEl.textContent = payload ? JSON.stringify(payload, null, 2) : 'No JSON payload provided.';
}

async function runCrewAgent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const runButton = $('#runButton');
  const streamOutput = $('#streamOutput');
  const statusChip = $('#runStatus');
  const agent = $('#agentSelect')?.value;
  const goal = $('#goalInput')?.value.trim();
  const context = $('#contextInput')?.value.trim();

  if (!agent || !goal) return;

  if (runButton) runButton.disabled = true;
  if (statusChip) statusChip.textContent = 'Streaming...';
  if (streamOutput) streamOutput.textContent = '';

  const response = await fetch('/api/crew/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent, goal, context })
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    if (statusChip) statusChip.textContent = 'Failed to run.';
    if (runButton) runButton.disabled = false;
    throw new Error(errorText || 'Run failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let payload = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (chunk.startsWith('data:')) {
        const data = chunk.replace(/^data:\s*/, '');
        if (data === '[DONE]') {
          break;
        }
        try {
          const payloadChunk = JSON.parse(data);
          if (payloadChunk.type === 'token') {
            fullText += payloadChunk.value;
            if (streamOutput) streamOutput.textContent = fullText;
          }
          if (payloadChunk.type === 'done') {
            payload = payloadChunk.outputJson || null;
          }
        } catch (error) {
          // ignore malformed chunks
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
  }

  updateOutputPanels(fullText, payload);

  if (statusChip) statusChip.textContent = 'Complete';
  if (runButton) runButton.disabled = false;
}

function mountDeliverableActions() {
  const copyButton = $('#copyMarkdown');
  const downloadButton = $('#downloadMarkdown');
  const exportButton = $('#exportJson');
  const streamOutput = $('#streamOutput');
  const payloadOutput = $('#jsonOutput');

  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      if (!streamOutput) return;
      await navigator.clipboard.writeText(streamOutput.textContent || '');
      copyButton.textContent = 'Copied!';
      setTimeout(() => (copyButton.textContent = 'Copy to clipboard'), 1500);
    });
  }

  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      if (!streamOutput) return;
      const blob = new Blob([streamOutput.textContent || ''], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'crew-deliverables.md';
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      if (!payloadOutput) return;
      const blob = new Blob([payloadOutput.textContent || '{}'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'crew-deliverables.json';
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}

async function loadRecentRuns() {
  const recent = $('#recentRuns');
  if (!recent) return;
  try {
    const data = await fetchJson('/api/crew/history?limit=5');
    if (!data?.runs?.length) {
      recent.innerHTML = '<p>No runs yet. Launch the console to create one.</p>';
      return;
    }
    recent.innerHTML = data.runs
      .map(run => `
        <div class="output-card">
          <h4>${run.agent}</h4>
          <p>${run.goal}</p>
          <p class="notice-chip">${formatDate(run.created_at)}</p>
        </div>
      `)
      .join('');
  } catch (error) {
    recent.innerHTML = '<p>Unable to load runs right now.</p>';
  }
}

async function loadHistory() {
  const tableBody = $('#historyTableBody');
  if (!tableBody) return;
  const searchInput = $('#historySearch');
  const agentFilter = $('#historyAgentFilter');

  const load = async () => {
    const params = new URLSearchParams();
    if (searchInput?.value) params.set('q', searchInput.value);
    if (agentFilter?.value) params.set('agent', agentFilter.value);
    const data = await fetchJson(`/api/crew/history?${params.toString()}`);
    tableBody.innerHTML = data.runs
      .map(run => `
        <tr>
          <td>${run.agent}</td>
          <td>${run.goal}</td>
          <td>${run.status}</td>
          <td>${formatDate(run.created_at)}</td>
        </tr>
      `)
      .join('');
  };

  let debounceTimer = null;
  const schedule = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 250);
  };

  searchInput?.addEventListener('input', schedule);
  agentFilter?.addEventListener('change', load);

  await load();
}

async function loadVault() {
  const form = $('#vaultForm');
  if (!form) return;
  const data = await fetchJson('/api/crew/vault');
  Object.entries(data.vault).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) field.value = value || '';
  });
}

function mountVaultSave() {
  const form = $('#vaultForm');
  const saveButton = $('#saveVault');
  if (!form || !saveButton) return;

  saveButton.addEventListener('click', async () => {
    const payload = Object.fromEntries(new FormData(form));
    await fetchJson('/api/crew/vault', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    saveButton.textContent = 'Saved!';
    setTimeout(() => (saveButton.textContent = 'Save Brand Vault'), 1500);
  });
}

function mountAgentFilter() {
  const filter = $('#historyAgentFilter');
  if (!filter) return;
  filter.innerHTML = '<option value="">All agents</option>' + AGENT_OPTIONS;
}

async function initCrewPage() {
  const session = await requireCrewAuth();
  if (!session) return;
  mountRoster();
  mountAgentSelect();
  mountAgentFilter();
  loadRecentRuns();
  loadHistory();
  loadVault();
  mountVaultSave();
  mountDeliverableActions();

  const runForm = $('#runForm');
  if (runForm) {
    runForm.addEventListener('submit', runCrewAgent);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCrewPage().catch(error => {
    console.error(error);
  });
});

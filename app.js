const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let latest = null;
let history = JSON.parse(localStorage.getItem('heliogrid-leads') || '[]');

const style = document.createElement('style');
style.textContent = `
.live-panel{margin-top:18px;padding:18px;border:1px solid #dfe8f0;border-radius:18px;background:#fbfdff;color:#0d1c32}
.live-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.live-stat{padding:12px;border-radius:12px;background:#f4f8fb;border:1px solid #e4edf4}
.live-stat strong{display:block;font-size:22px}.live-stat span{font-size:11px;color:#718096}
.history-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #e5edf4;font-size:12px}
.history-row:last-child{border-bottom:0}.history-row small{color:#718096}
.status-running{color:#b7791f}.status-complete{color:#13804b}.status-failed{color:#c53030}
@media(max-width:700px){.live-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function eventItem(title, description, state = 'complete') {
  const item = document.createElement('div');
  item.className = 'event';
  item.innerHTML = `<div class="dot">${state === 'failed' ? '!' : state === 'running' ? '…' : '✓'}</div><div><b>${escapeHtml(title)}</b><p>${escapeHtml(description)}</p></div><time class="status-${state}">${state}</time>`;
  $('timeline')?.appendChild(item);
}

function statusLabel(item) {
  if (!item) return 'unknown';
  if (item.status === 'not_configured') return 'not configured';
  if (['sent','created','updated'].includes(item.status)) return 'live';
  return item.status;
}

function renderHistory() {
  let panel = $('live-panel');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'live-panel';
    panel.className = 'live-panel';
    $('result')?.parentElement?.appendChild(panel);
  }
  const hot = history.filter((lead) => lead.tier === 'Hot').length;
  const avg = history.length ? Math.round(history.reduce((sum, lead) => sum + lead.score, 0) / history.length) : 0;
  panel.innerHTML = `<b>Live automation</b><div class="live-grid"><div class="live-stat"><strong>${history.length}</strong><span>Leads processed in this browser</span></div><div class="live-stat"><strong>${hot}</strong><span>Hot leads</span></div><div class="live-stat"><strong>${avg || '—'}</strong><span>Average score</span></div></div><div style="margin-top:16px"><b>Recent activity</b>${history.slice(-5).reverse().map((lead) => `<div class="history-row"><span>${escapeHtml(lead.name)}<br><small>${escapeHtml(lead.email)}</small></span><span>${lead.score}/100 · ${escapeHtml(lead.tier)}<br><small>${escapeHtml(lead.rep)}</small></span></div>`).join('') || '<p style="color:#718096;font-size:12px">No leads processed in this browser yet.</p>'}</div>`;
}

renderHistory();

$('form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('run');
  button.disabled = true;
  button.textContent = 'Running live automation…';
  $('timeline').innerHTML = '';
  $('result').classList.remove('show');

  const payload = { name: $('name').value.trim(), email: $('email').value.trim(), phone: $('phone')?.value.trim() || '', service: $('service').value, budget: $('budget').value, timeline: $('timeline-select').value, message: $('message').value.trim() };

  eventItem('Lead received', 'Lead captured and sent to the live serverless workflow.', 'running');

  try {
    const response = await fetch('/api/process-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Automation request failed');

    await wait(250);
    eventItem('AI qualification', `Score calculated: ${data.qualification.score}/100.`);
    await wait(250);
    eventItem('Smart routing', `Classified as ${data.qualification.tier}; assigned to ${data.routing.representative}.`);

    const integrationEntries = [
      ['HubSpot CRM', data.integrations?.crm],
      ['Slack', data.integrations?.slack],
      ['Email', data.integrations?.email],
      ['Automation webhook', data.integrations?.webhook]
    ];

    for (const [label, integration] of integrationEntries) {
      await wait(220);
      eventItem(label, `Status: ${statusLabel(integration)}${integration?.error ? ` — ${integration.error}` : ''}`, integration?.status === 'failed' ? 'failed' : 'complete');
    }

    eventItem('Workflow completed', `Automation status: ${data.automation.status} · Workflow ID: ${data.workflowId}`);

    $('tier').textContent = `${data.qualification.tier.toUpperCase()} LEAD`;
    $('score').textContent = `${data.qualification.score} / 100`;
    $('rep').textContent = data.routing.representative;
    $('result').classList.add('show');

    latest = data;
    history.push({
      name: payload.name,
      email: payload.email,
      score: data.qualification.score,
      tier: data.qualification.tier,
      rep: data.routing.representative,
      workflowId: data.workflowId,
      at: data.createdAt
    });
    history = history.slice(-25);
    localStorage.setItem('heliogrid-leads', JSON.stringify(history));
    renderHistory();

    const book = $('book');
    if (data.followUp?.bookingUrl) {
      book.textContent = 'Open booking calendar ↗';
      book.disabled = false;
    } else {
      book.textContent = 'Booking URL not configured';
      book.disabled = true;
    }
    button.textContent = 'Run automation again ↻';
  } catch (error) {
    eventItem('Automation failed', error.message, 'failed');
    button.textContent = 'Retry automation →';
  } finally {
    button.disabled = false;
  }
});

$('book')?.addEventListener('click', () => {
  if (!latest?.followUp?.bookingUrl) return;
  window.open(latest.followUp.bookingUrl, '_blank', 'noopener,noreferrer');
  eventItem('Booking handoff', 'Opened the configured live booking calendar.');
  $('book').textContent = 'Booking calendar opened ✓';
});

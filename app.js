const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let latest = null;
let history = JSON.parse(localStorage.getItem('heliogrid-leads') || '[]');

const style = document.createElement('style');
style.textContent = `
  .live-panel{margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.035)}
  .live-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
  .live-stat{padding:12px;border-radius:12px;background:rgba(255,255,255,.05)}
  .live-stat strong{display:block;font-size:22px}.live-stat span{font-size:11px;opacity:.65}
  .history-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px}
  .history-row:last-child{border-bottom:0}.history-row small{opacity:.65}
  .status-running{color:#fbbf24}.status-complete{color:#86efac}.status-failed{color:#fca5a5}
  @media(max-width:700px){.live-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

function eventItem(title, description, state = 'complete') {
  const item = document.createElement('div');
  item.className = 'event';
  item.innerHTML = `<div class="dot">${state === 'failed' ? '!' : state === 'running' ? '…' : '✓'}</div><div><b>${title}</b><p>${description}</p></div><time class="status-${state}">${state}</time>`;
  $('timeline')?.appendChild(item);
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
  panel.innerHTML = `<b>Live automation telemetry</b><div class="live-grid"><div class="live-stat"><strong>${history.length}</strong><span>Leads processed</span></div><div class="live-stat"><strong>${hot}</strong><span>Hot leads</span></div><div class="live-stat"><strong>${avg || '—'}</strong><span>Average score</span></div></div><div style="margin-top:16px"><b>Recent lead activity</b>${history.slice(-5).reverse().map((lead) => `<div class="history-row"><span>${escapeHtml(lead.name)}<br><small>${escapeHtml(lead.email)}</small></span><span>${lead.score}/100 · ${lead.tier}<br><small>${lead.rep}</small></span></div>`).join('') || '<p style="opacity:.6;font-size:12px">No leads processed in this browser yet.</p>'}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

renderHistory();

$('form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('run');
  button.disabled = true;
  button.textContent = 'Running workflow…';
  $('timeline').innerHTML = '';
  $('result').classList.remove('show');

  const payload = { name: $('name').value.trim(), email: $('email').value.trim(), bill: $('bill').value, urgency: $('urgency').value, message: $('message').value.trim() };
  eventItem('Lead received', 'Payload captured and sent to the qualification service.', 'running');

  try {
    const response = await fetch('/api/process-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'API request failed');

    await wait(300); eventItem('AI qualification', `Score calculated: ${data.qualification.score}/100.`);
    await wait(300); eventItem('Smart routing', `Classified as ${data.qualification.tier}; assigned to ${data.routing.representative}.`);
    await wait(300); eventItem('CRM sync', `HubSpot integration status: ${data.integrations?.crm?.status || 'not connected'}.`);
    await wait(300); eventItem('Notifications', `Slack: ${data.integrations?.slack?.status || 'not connected'} · SMS: ${data.integrations?.sms?.status || 'not connected'}.`);
    await wait(300); eventItem('Workflow completed', 'Lead is ready for the next human follow-up step.');

    $('tier').textContent = `${data.qualification.tier.toUpperCase()} LEAD`;
    $('score').textContent = `${data.qualification.score} / 100`;
    $('rep').textContent = data.routing.representative;
    $('result').classList.add('show');
    latest = data;
    history.push({ name: payload.name, email: payload.email, score: data.qualification.score, tier: data.qualification.tier, rep: data.routing.representative, at: new Date().toISOString() });
    history = history.slice(-25);
    localStorage.setItem('heliogrid-leads', JSON.stringify(history));
    renderHistory();
    button.textContent = 'Run again ↻';
  } catch (error) {
    eventItem('Workflow failed', error.message, 'failed');
    button.textContent = 'Retry →';
  } finally { button.disabled = false; }
});

$('book')?.addEventListener('click', () => {
  if (!latest) return;
  eventItem('Appointment handoff', 'Confirmation recorded locally. No external calendar was contacted.');
  $('book').textContent = 'Handoff confirmed ✓';
  $('book').disabled = true;
});
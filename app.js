const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let latest = null;

function eventItem(title, description, state = 'complete') {
  const item = document.createElement('div');
  item.className = 'event';
  item.innerHTML = `<div class="dot">✓</div><div><b>${title}</b><p>${description}</p></div><time>${state}</time>`;
  $('timeline').appendChild(item);
}

$('form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('run');
  button.disabled = true;
  button.textContent = 'Calling API…';
  $('timeline').innerHTML = '';
  $('result').classList.remove('show');

  const payload = {
    name: $('name').value.trim(),
    email: $('email').value.trim(),
    bill: $('bill').value,
    urgency: $('urgency').value,
    message: $('message').value.trim()
  };

  eventItem('Lead received', 'Lead payload validated in the browser.', 'running');

  try {
    const response = await fetch('/api/process-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'API request failed');

    eventItem('AI qualification', `Score calculated: ${data.qualification.score}/100.`);
    await wait(250);
    eventItem('Smart routing', `Classified as ${data.qualification.tier}; assigned to ${data.routing.representative}.`);
    await wait(250);
    eventItem('CRM status', `HubSpot: ${data.integrations?.crm?.status || 'demo'}.`);
    await wait(250);
    eventItem('Follow-up status', `Slack: ${data.integrations?.slack?.status || 'demo'} · SMS: ${data.integrations?.sms?.status || 'demo'}.`);
    await wait(250);
    eventItem('Booking ready', 'The lead is ready for a manual appointment handoff.');

    $('tier').textContent = `${data.qualification.tier.toUpperCase()} LEAD`;
    $('score').textContent = `${data.qualification.score} / 100`;
    $('rep').textContent = data.routing.representative;
    $('result').classList.add('show');
    latest = data;
    button.textContent = 'Run again ↻';
  } catch (error) {
    eventItem('API error', error.message, 'failed');
    button.textContent = 'Retry →';
  } finally {
    button.disabled = false;
  }
});

$('book')?.addEventListener('click', () => {
  if (!latest) return;
  eventItem('Appointment handoff', 'Demo booking confirmed locally. No external calendar was contacted.');
  $('book').textContent = 'Handoff confirmed ✓';
  $('book').disabled = true;
});
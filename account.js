async function fetchEvents() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const res = await fetch('/events', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data = await res.json();
  const list = document.getElementById('eventsList');
  list.innerHTML = '';
  data.forEach(ev => {
    const li = document.createElement('li');
    li.textContent = `${ev.type} - ${ev.created_at}`;
    list.appendChild(li);
  });
}

document.getElementById('logEvent').addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  await fetch('/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ type: 'sample', metadata: { info: 'clicked button' } })
  });
  fetchEvents();
});

document.getElementById('deleteEvents').addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  await fetch('/events', {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  fetchEvents();
});

fetchEvents();

const API = '/api/leads';
let TOKEN = sessionStorage.getItem('crmToken') || null;

const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const leadForm = document.getElementById('leadForm');
const leadsTableBody = document.getElementById('leadsTableBody');
const leadCount = document.getElementById('leadCount');
const emptyState = document.getElementById('emptyState');
const statPills = document.querySelectorAll('.stat-pill');
const searchInput = document.getElementById('searchInput');

let allLeads = [];
let activeFilter = 'all';
let searchTerm = '';
let openNotesId = null;

function showDashboard() {
  loginScreen.style.display = 'none';
  dashboardScreen.style.display = 'block';
  fetchLeads();
}

function showLogin() {
  dashboardScreen.style.display = 'none';
  loginScreen.style.display = 'flex';
}

if (TOKEN) {
  showDashboard();
} else {
  showLogin();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (data.success) {
    TOKEN = data.token;
    sessionStorage.setItem('crmToken', TOKEN);
    loginError.textContent = '';
    loginForm.reset();
    showDashboard();
  } else {
    loginError.textContent = 'Incorrect username or password. Try again.';
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('crmToken');
  TOKEN = null;
  showLogin();
});

async function fetchLeads() {
  const res = await fetch(API, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (res.status === 401) {
    showLogin();
    return;
  }
  allLeads = await res.json();
  updateCounts();
  renderLeads();
}

function updateCounts() {
  document.getElementById('countAll').textContent = allLeads.length;
  document.getElementById('countNew').textContent = allLeads.filter(l => l.status === 'new').length;
  document.getElementById('countContacted').textContent = allLeads.filter(l => l.status === 'contacted').length;
  document.getElementById('countConverted').textContent = allLeads.filter(l => l.status === 'converted').length;
  document.getElementById('countLost').textContent = allLeads.filter(l => l.status === 'lost').length;
}

function renderLeads() {
  let filtered = activeFilter === 'all' ? allLeads : allLeads.filter(l => l.status === activeFilter);

  if (searchTerm) {
    filtered = filtered.filter(l =>
      l.name.toLowerCase().includes(searchTerm) ||
      l.email.toLowerCase().includes(searchTerm)
    );
  }

  leadsTableBody.innerHTML = '';
  leadCount.textContent = filtered.length;
  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';
  emptyState.textContent = allLeads.length === 0
    ? 'No leads yet — add your first one above.'
    : 'No leads match your search or filter.';

  filtered.forEach((lead) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="lead-name">${lead.name}</td>
      <td class="lead-email">${lead.email}</td>
      <td class="lead-phone">${lead.phone || '—'}</td>
      <td><span class="source-tag">${lead.source || 'Unknown'}</span></td>
      <td>
        <select class="status-select status-${lead.status}" data-id="${lead.id}">
          <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
          <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
          <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted</option>
          <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost</option>
        </select>
      </td>
      <td>${new Date(lead.created_at).toLocaleDateString()}</td>
      <td class="actions-cell">
        <button class="notes-btn" data-id="${lead.id}">📝 Notes</button>
        <button class="delete-btn" data-id="${lead.id}">Delete</button>
      </td>
    `;
    leadsTableBody.appendChild(row);

    if (openNotesId === lead.id) {
      const notesRow = document.createElement('tr');
      notesRow.className = 'notes-row';
      notesRow.innerHTML = `
        <td colspan="7">
          <textarea class="notes-area" placeholder="Add notes about this lead..." data-id="${lead.id}">${lead.notes || ''}</textarea>
        </td>
      `;
      leadsTableBody.appendChild(notesRow);
    }
  });

  attachEventListeners();
}

function attachEventListeners() {
  document.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ status })
      });
      fetchLeads();
    });
  });

  document.querySelectorAll('.notes-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.dataset.id);
      openNotesId = openNotesId === id ? null : id;
      renderLeads();
    });
  });

  document.querySelectorAll('.notes-area').forEach((textarea) => {
    textarea.addEventListener('blur', async (e) => {
      const id = e.target.dataset.id;
      const notes = e.target.value;
      await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ notes })
      });
    });
  });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      fetchLeads();
    });
  });
}

statPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    statPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.dataset.filter;
    renderLeads();
  });
});

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value.toLowerCase();
  renderLeads();
});

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const source = document.getElementById('source').value;

  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ name, email, phone, source })
  });

  leadForm.reset();
  fetchLeads();
});
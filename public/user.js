const userForm = document.getElementById('userForm');
const userNameInput = document.getElementById('userNameInput');
const refreshBtn = document.getElementById('refreshBtn');
const userFeedback = document.getElementById('userFeedback');
const activeUserLabel = document.getElementById('activeUserLabel');
const userHint = document.getElementById('userHint');
const totalCount = document.getElementById('totalCount');
const receivedCount = document.getElementById('receivedCount');
const completedCount = document.getElementById('completedCount');
const updatedAt = document.getElementById('updatedAt');
const userTaskList = document.getElementById('userTaskList');
const template = document.getElementById('userTaskTemplate');

const state = {
  activeUser: localStorage.getItem('taskflow.activeUser') || '',
  tasks: []
};

const quickPickButtons = document.querySelectorAll('[data-user]');

function formatDate(isoString) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(isoString));
}

function priorityLabel(priority) {
  if (priority === 'high') return 'Tinggi';
  if (priority === 'low') return 'Rendah';
  return 'Sedang';
}

function statusLabel(status) {
  if (status === 'received') return 'Diterima';
  if (status === 'completed') return 'Selesai';
  return 'Menunggu';
}

function statusClass(status) {
  if (status === 'received') return 'status-received';
  if (status === 'completed') return 'status-completed';
  return 'status-assigned';
}

function setFeedback(message, type = 'info') {
  userFeedback.textContent = message;
  userFeedback.style.color = type === 'error' ? '#ffb0c1' : '#a8b4d6';
}

function updateSummary(tasks) {
  totalCount.textContent = tasks.length;
  receivedCount.textContent = tasks.filter((task) => task.status === 'received').length;
  completedCount.textContent = tasks.filter((task) => task.status === 'completed').length;
}

function setActiveUser(userName) {
  state.activeUser = userName.trim();
  localStorage.setItem('taskflow.activeUser', state.activeUser);
  activeUserLabel.textContent = state.activeUser || 'Belum dipilih';
  userHint.textContent = state.activeUser
    ? `Menampilkan tugas untuk ${state.activeUser}`
    : 'Masukkan nama user untuk melihat tugas yang ditugaskan.';
}

async function loadTasks() {
  if (!state.activeUser) {
    userTaskList.innerHTML = '<div class="empty-state">Pilih nama user terlebih dahulu.</div>';
    updateSummary([]);
    return;
  }

  try {
    const response = await fetch(`/api/tasks?recipient=${encodeURIComponent(state.activeUser)}`);
    if (!response.ok) {
      throw new Error('Gagal memuat tugas user.');
    }

    const tasks = await response.json();
    state.tasks = tasks;
    renderTasks(tasks);
    updatedAt.textContent = `Diperbarui ${new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date())}`;
    setFeedback('');
  } catch (error) {
    userTaskList.innerHTML = '<div class="empty-state">Gagal memuat data dari server.</div>';
    setFeedback(error.message, 'error');
  }
}

async function patchTask(taskId, payload) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Gagal memperbarui tugas.');
  }

  await loadTasks();
}

function renderTasks(tasks) {
  userTaskList.innerHTML = '';

  if (!tasks.length) {
    userTaskList.innerHTML = '<div class="empty-state">Belum ada tugas untuk user ini.</div>';
    updateSummary(tasks);
    return;
  }

  tasks.forEach((task) => {
    const node = template.content.cloneNode(true);
    const article = node.querySelector('.task-item');
    const title = node.querySelector('.task-title');
    const desc = node.querySelector('.task-desc');
    const meta = node.querySelector('.task-meta');
    const priorityTag = node.querySelector('.priority-tag');
    const statusTag = node.querySelector('.status-tag');
    const acceptBtn = node.querySelector('.accept-btn');
    const completeBtn = node.querySelector('.complete-btn');

    article.dataset.id = task.id;
    title.textContent = task.title;
    desc.textContent = task.description || 'Tidak ada deskripsi.';
    meta.textContent = `Dikirim admin · Dibuat ${formatDate(task.createdAt)}`;
    priorityTag.textContent = priorityLabel(task.priority);
    priorityTag.classList.add(`priority-${task.priority}`);
    statusTag.textContent = statusLabel(task.status);
    statusTag.classList.add(statusClass(task.status));

    if (task.status === 'assigned') {
      acceptBtn.style.display = 'inline-flex';
      completeBtn.style.display = 'none';
      acceptBtn.addEventListener('click', async () => {
        await patchTask(task.id, { status: 'received' });
      });
    } else if (task.status === 'received') {
      acceptBtn.style.display = 'none';
      completeBtn.style.display = 'inline-flex';
      completeBtn.addEventListener('click', async () => {
        await patchTask(task.id, { status: 'completed' });
      });
    } else {
      acceptBtn.style.display = 'none';
      completeBtn.style.display = 'none';
    }

    userTaskList.appendChild(node);
  });

  updateSummary(tasks);
}

userForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const userName = userNameInput.value.trim();

  if (!userName) {
    setFeedback('Nama user harus diisi.', 'error');
    return;
  }

  setActiveUser(userName);
  setFeedback(`Menampilkan tugas untuk ${state.activeUser}.`);
  await loadTasks();
});

refreshBtn.addEventListener('click', () => {
  if (!state.activeUser) {
    setFeedback('Isi nama user terlebih dahulu.', 'error');
    return;
  }

  loadTasks();
});

quickPickButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const userName = button.dataset.user || '';
    userNameInput.value = userName;
    setActiveUser(userName);
    setFeedback(`User ${userName} dipilih.`);
    loadTasks();
  });
});

if (state.activeUser) {
  userNameInput.value = state.activeUser;
  setActiveUser(state.activeUser);
  loadTasks();
} else {
  setActiveUser('');
  userTaskList.innerHTML = '<div class="empty-state">Pilih nama user terlebih dahulu.</div>';
}

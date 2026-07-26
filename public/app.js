const taskList = document.getElementById('taskList');
const taskForm = document.getElementById('taskForm');
const formFeedback = document.getElementById('formFeedback');
const refreshBtn = document.getElementById('refreshBtn');
const serverStatus = document.getElementById('serverStatus');
const serverHint = document.getElementById('serverHint');
const totalCount = document.getElementById('totalCount');
const doneCount = document.getElementById('doneCount');
const openCount = document.getElementById('openCount');
const template = document.getElementById('taskTemplate');
const recipientInput = document.getElementById('recipientInput');

const state = {
  tasks: []
};

function escapeText(value) {
  return String(value ?? '');
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(isoString));
}

function setFeedback(message, type = 'info') {
  formFeedback.textContent = message;
  formFeedback.style.color = type === 'error' ? '#ffb0c1' : '#a8b4d6';
}

function updateSummary(tasks) {
  totalCount.textContent = tasks.length;
  doneCount.textContent = tasks.filter((task) => task.status === 'received').length;
  openCount.textContent = tasks.filter((task) => task.status === 'completed').length;
}

function priorityLabel(priority) {
  if (priority === 'high') return 'Tinggi';
  if (priority === 'low') return 'Rendah';
  return 'Sedang';
}

function statusLabel(status) {
  if (status === 'received') return 'Diterima user';
  if (status === 'completed') return 'Selesai';
  return 'Menunggu user';
}

function statusClass(status) {
  if (status === 'received') return 'status-received';
  if (status === 'completed') return 'status-completed';
  return 'status-assigned';
}

async function updateTask(taskId, payload) {
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

async function deleteTask(taskId) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE'
  });

  if (!response.ok && response.status !== 204) {
    throw new Error('Gagal menghapus tugas.');
  }

  await loadTasks();
}

function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (!tasks.length) {
    taskList.innerHTML = `
      <div class="task-item" style="justify-content:center; text-align:center;">
        <div>
          <h3 class="task-title">Belum ada tugas untuk user</h3>
          <p class="task-desc">Isi form di atas untuk mengirim tugas ke user tertentu.</p>
        </div>
      </div>
    `;
    updateSummary(tasks);
    return;
  }

  tasks.forEach((task) => {
    const node = template.content.cloneNode(true);
    const article = node.querySelector('.task-item');
    const check = node.querySelector('.task-check');
    const title = node.querySelector('.task-title');
    const desc = node.querySelector('.task-desc');
    const meta = node.querySelector('.task-meta');
    const priorityTag = node.querySelector('.priority-tag');
    const statusTag = node.querySelector('.status-tag');
    const deleteBtn = node.querySelector('.delete-btn');

    article.dataset.id = task.id;
    article.classList.toggle('completed', task.status === 'completed');
    check.checked = task.status === 'completed';
    title.textContent = escapeText(task.title);
    desc.textContent = task.description ? escapeText(task.description) : 'Tidak ada deskripsi.';
    meta.textContent = `${task.recipient ? `Untuk ${escapeText(task.recipient)}` : 'Belum ada user'} · Dibuat ${formatDate(task.createdAt)}`;
    priorityTag.textContent = priorityLabel(task.priority);
    priorityTag.classList.add(`priority-${task.priority}`);
    statusTag.textContent = statusLabel(task.status);
    statusTag.classList.add(statusClass(task.status));

    check.addEventListener('change', async () => {
      await updateTask(task.id, { status: check.checked ? 'completed' : 'assigned' });
    });

    deleteBtn.addEventListener('click', async () => {
      const confirmed = window.confirm('Hapus tugas ini?');
      if (!confirmed) return;
      await deleteTask(task.id);
    });

    taskList.appendChild(node);
  });

  updateSummary(tasks);
}

async function loadTasks() {
  try {
    const response = await fetch('/api/tasks');
    if (!response.ok) throw new Error('Gagal memuat data tugas.');
    const tasks = await response.json();
    state.tasks = tasks;
    renderTasks(tasks);
    serverStatus.textContent = 'Online';
    serverHint.textContent = 'Admin terhubung ke server sebagai perantara data';
    setFeedback('');
  } catch (error) {
    serverStatus.textContent = 'Offline';
    serverHint.textContent = 'Periksa server Express dan refresh halaman';
    setFeedback(error.message, 'error');
    taskList.innerHTML = '';
  }
}

async function createTask(payload) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Gagal menyimpan tugas.');
  }

  return data;
}

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = document.getElementById('titleInput').value.trim();
  const recipient = recipientInput.value.trim();
  const description = document.getElementById('descriptionInput').value.trim();
  const priority = document.getElementById('priorityInput').value;

  if (!title) {
    setFeedback('Judul tugas wajib diisi.', 'error');
    return;
  }

  if (!recipient) {
    setFeedback('Nama user penerima wajib diisi.', 'error');
    return;
  }

  try {
    await createTask({ title, recipient, description, priority });
    taskForm.reset();
    document.getElementById('priorityInput').value = 'medium';
    setFeedback(`Tugas berhasil dikirim ke ${recipient}.`);
    await loadTasks();
  } catch (error) {
    setFeedback(error.message, 'error');
  }
});

refreshBtn.addEventListener('click', loadTasks);

loadTasks();

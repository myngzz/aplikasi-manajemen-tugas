const apiStatus = document.getElementById('apiStatus');
const apiHint = document.getElementById('apiHint');
const totalTasks = document.getElementById('totalTasks');
const openTasks = document.getElementById('openTasks');
const doneTasks = document.getElementById('doneTasks');
const updatedAt = document.getElementById('updatedAt');
const refreshBtn = document.getElementById('refreshBtn');
const taskList = document.getElementById('serverTaskList');
const template = document.getElementById('serverTaskTemplate');

function formatDate(isoString) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(isoString));
}

function priorityClass(priority) {
  if (priority === 'high') return 'priority-high';
  if (priority === 'low') return 'priority-low';
  return 'priority-medium';
}

function statusClass(status) {
  if (status === 'received') return 'state-received';
  if (status === 'completed') return 'state-done';
  return 'state-open';
}

function priorityLabel(priority) {
  if (priority === 'high') return 'Tinggi';
  if (priority === 'low') return 'Rendah';
  return 'Sedang';
}

function statusLabel(status) {
  if (status === 'received') return 'Diterima';
  if (status === 'completed') return 'Selesai';
  return 'Ditugaskan';
}

function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (!tasks.length) {
    taskList.innerHTML = '<div class="empty-state">Belum ada data tugas di server.</div>';
    return;
  }

  tasks.forEach((task) => {
    const node = template.content.cloneNode(true);
    const row = node.querySelector('.task-row');
    const title = node.querySelector('.task-title');
    const desc = node.querySelector('.task-desc');
    const recipientTag = node.querySelector('.recipient-tag');
    const priorityTag = node.querySelector('.priority-tag');
    const stateTag = node.querySelector('.state-tag');

    row.dataset.id = task.id;
    title.textContent = task.title;
    desc.textContent = `${task.description || 'Tidak ada deskripsi.'} · Dibuat ${formatDate(task.createdAt)}`;
    recipientTag.textContent = task.recipient ? `Untuk ${task.recipient}` : 'Belum ada user';
    priorityTag.textContent = priorityLabel(task.priority);
    priorityTag.classList.add(priorityClass(task.priority));
    stateTag.textContent = statusLabel(task.status);
    stateTag.classList.add(statusClass(task.status));

    taskList.appendChild(node);
  });
}

async function loadServerData() {
  apiStatus.textContent = 'Memuat...';
  apiHint.textContent = 'Menghubungi endpoint kesehatan server';

  try {
    const [healthResponse, tasksResponse] = await Promise.all([
      fetch('/api/health'),
      fetch('/api/tasks')
    ]);

    if (!healthResponse.ok || !tasksResponse.ok) {
      throw new Error('Server tidak merespons dengan benar.');
    }

    const health = await healthResponse.json();
    const tasks = await tasksResponse.json();

    apiStatus.textContent = health.ok ? 'Online' : 'Gangguan';
    apiHint.textContent = `Service: ${health.service}`;
    totalTasks.textContent = tasks.length;
    doneTasks.textContent = tasks.filter((task) => task.status === 'completed').length;
    openTasks.textContent = tasks.filter((task) => task.status !== 'completed').length;
    updatedAt.textContent = `Diperbarui ${new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date())}`;

    renderTasks(tasks);
  } catch (error) {
    apiStatus.textContent = 'Offline';
    apiHint.textContent = error.message;
    taskList.innerHTML = '<div class="empty-state">Gagal memuat data dari server.</div>';
  }
}

refreshBtn.addEventListener('click', loadServerData);
loadServerData();

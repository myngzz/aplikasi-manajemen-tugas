const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'tasks.json');
const publicDir = path.join(__dirname, 'public');
const adminFile = path.join(publicDir, 'index.html');
const userFile = path.join(publicDir, 'user.html');
const serverFile = path.join(publicDir, 'server.html');

app.use(express.json());

app.get('/', (_req, res) => {
  res.sendFile(adminFile);
});

app.get('/admin', (_req, res) => {
  res.sendFile(adminFile);
});

app.get('/user', (_req, res) => {
  res.sendFile(userFile);
});

app.get('/server', (_req, res) => {
  res.sendFile(serverFile);
});

app.use(express.static(publicDir));

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    const seed = [
      {
        id: 'task-1',
        title: 'Tentukan kebutuhan aplikasi',
        description: 'Menjelaskan alur client-server dan data yang diproses oleh server.',
        priority: 'high',
        recipient: 'Budi',
        status: 'assigned',
        completed: false,
        receivedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-2',
        title: 'Siapkan demo presentasi',
        description: 'Pastikan UI, API, dan penyimpanan JSON berjalan stabil.',
        priority: 'medium',
        recipient: 'Siti',
        status: 'completed',
        completed: true,
        receivedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    await fs.writeFile(dataFile, JSON.stringify(seed, null, 2), 'utf8');
  }
}

async function readTasks() {
  await ensureStorage();
  const raw = await fs.readFile(dataFile, 'utf8');
  const tasks = JSON.parse(raw);
  return tasks.map((task) => normalizeTask(task));
}

async function writeTasks(tasks) {
  await fs.writeFile(dataFile, JSON.stringify(tasks, null, 2), 'utf8');
}

function normalizeTask(task) {
  const completed = typeof task.completed === 'boolean' ? task.completed : task.status === 'completed';
  const status = ['assigned', 'received', 'completed'].includes(task.status)
    ? task.status
    : completed
      ? 'completed'
      : task.receivedAt
        ? 'received'
        : 'assigned';

  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    recipient: String(task.recipient || '').trim(),
    status,
    completed,
    receivedAt: task.receivedAt || null,
    completedAt: task.completedAt || null,
    createdAt: task.createdAt || new Date().toISOString()
  };
}

function createTask(payload) {
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const recipient = String(payload.recipient || '').trim();
  const priority = ['low', 'medium', 'high'].includes(payload.priority) ? payload.priority : 'medium';

  if (!title) {
    return { error: 'Judul tugas tidak boleh kosong.' };
  }

  if (!recipient) {
    return { error: 'Nama penerima tugas wajib diisi.' };
  }

  return {
    id: `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title,
    description,
    priority,
    recipient,
    status: 'assigned',
    completed: false,
    receivedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString()
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aplikasi-manajemen-tugas-sederhana' });
});

app.get('/api/tasks', async (_req, res, next) => {
  try {
    const tasks = await readTasks();
    const recipient = String(_req.query.recipient || '').trim().toLowerCase();
    const status = String(_req.query.status || '').trim().toLowerCase();

    let filtered = tasks;

    if (recipient) {
      filtered = filtered.filter((task) => String(task.recipient || '').toLowerCase() === recipient);
    }

    if (status && ['assigned', 'received', 'completed'].includes(status)) {
      filtered = filtered.filter((task) => task.status === status);
    }

    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

app.post('/api/tasks', async (req, res, next) => {
  try {
    const task = createTask(req.body);

    if (task.error) {
      return res.status(400).json({ message: task.error });
    }

    const tasks = await readTasks();
    tasks.unshift(task);
    await writeTasks(tasks);

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/tasks/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const taskIndex = tasks.findIndex((item) => item.id === req.params.id);

    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
    }

    const current = normalizeTask(tasks[taskIndex]);
    const requestedStatus = ['assigned', 'received', 'completed'].includes(String(req.body.status || '').toLowerCase())
      ? String(req.body.status).toLowerCase()
      : null;
    const nextStatus = requestedStatus || (req.body.completed === true ? 'completed' : req.body.received === true ? 'received' : current.status);
    const updated = {
      ...current,
      title: typeof req.body.title === 'string' ? req.body.title.trim() : current.title,
      description: typeof req.body.description === 'string' ? req.body.description.trim() : current.description,
      recipient: typeof req.body.recipient === 'string' ? req.body.recipient.trim() : current.recipient,
      priority: ['low', 'medium', 'high'].includes(req.body.priority) ? req.body.priority : current.priority,
      status: nextStatus,
      completed: nextStatus === 'completed'
    };

    if (!updated.title) {
      return res.status(400).json({ message: 'Judul tugas tidak boleh kosong.' });
    }

    if (!updated.recipient) {
      return res.status(400).json({ message: 'Nama penerima tugas tidak boleh kosong.' });
    }

    if (updated.status === 'received' && !current.receivedAt) {
      updated.receivedAt = new Date().toISOString();
    }

    if (updated.status === 'completed') {
      updated.receivedAt = current.receivedAt || new Date().toISOString();
      updated.completedAt = current.completedAt || new Date().toISOString();
    }

    if (updated.status === 'assigned') {
      updated.receivedAt = null;
      updated.completedAt = null;
      updated.completed = false;
    }

    tasks[taskIndex] = updated;
    await writeTasks(tasks);

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const filtered = tasks.filter((item) => item.id !== req.params.id);

    if (filtered.length === tasks.length) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
    }

    await writeTasks(filtered);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

ensureStorage().then(() => {
  app.listen(port, () => {
    console.log(`Aplikasi berjalan di http://localhost:${port}`);
  });
}).catch((error) => {
  console.error('Gagal menyiapkan penyimpanan data:', error);
  process.exit(1);
});

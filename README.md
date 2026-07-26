# Aplikasi Manajemen Tugas Sederhana

Aplikasi web sederhana berbasis client-server untuk tugas sistem terdistribusi.

## Fitur
- Halaman admin untuk mengirim tugas ke user tertentu.
- Halaman user untuk menerima dan menyelesaikan tugas.
- Halaman server untuk memantau status API dan data storage.
- Menambah, memperbarui, menerima, dan menghapus tugas.
- Menyimpan data persisten ke file JSON.

## Arsitektur
- Admin: browser yang menjalankan JavaScript pada `public/app.js`.
- User: browser yang menjalankan JavaScript pada `public/user.js`.
- Server dashboard: halaman `public/server.html` yang membaca endpoint API yang sama.
- Server: Express pada `server.js`.
- Storage: file `data/tasks.json`.

## Menjalankan
1. Install dependensi:
   ```bash
   npm install
   ```
2. Jalankan aplikasi:
   ```bash
   npm start
   ```
3. Buka:
   - Admin: `http://localhost:3000`
   - User: `http://localhost:3000/user`
   - Server: `http://localhost:3000/server`

## API
- `GET /api/health`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

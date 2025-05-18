const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Veritabanı dosyasını oluştur
const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  ilce TEXT,
  mahalle TEXT,
  adres TEXT,
  aciklama TEXT,
  tarih TEXT,
  resim TEXT,
  ilaclamaZamani TEXT,
  ilaclandiMi INTEGER
);
CREATE TABLE IF NOT EXISTS chemicals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  stock REAL NOT NULL,
  used REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  desc TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  fullname TEXT,
  role TEXT DEFAULT 'user',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);`);

function addLog({ user_id, username, action, detail }) {
  db.prepare('INSERT INTO logs (user_id, username, action, detail) VALUES (?, ?, ?, ?)').run(user_id, username, action, detail);
}

// Tüm kaynakları getir
app.get('/api/resources', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM resources').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni kaynak ekle
app.post('/api/resources', (req, res) => {
  const { type, lat, lng, ilce, mahalle, adres, aciklama, tarih, resim } = req.body;
  if (!type || lat == null || lng == null) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  try {
    const stmt = db.prepare('INSERT INTO resources (type, lat, lng, ilce, mahalle, adres, aciklama, tarih, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(type, lat, lng, ilce || '', mahalle || '', adres || '', aciklama || '', tarih || '', resim || '');
    res.json({ id: info.lastInsertRowid, type, lat, lng, ilce, mahalle, adres, aciklama, tarih, resim });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// İlaçlar: Tümünü getir
app.get('/api/chemicals', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM chemicals').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// İlaç ekle
app.post('/api/chemicals', (req, res) => {
  const { name, stock, used } = req.body;
  if (!name || stock == null || used == null) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  try {
    const stmt = db.prepare('INSERT INTO chemicals (name, stock, used) VALUES (?, ?, ?)');
    const info = stmt.run(name, stock, used);
    res.json({ id: info.lastInsertRowid, name, stock, used });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// İlaç güncelle (PATCH)
app.patch('/api/chemicals/:id', (req, res) => {
  const { id } = req.params;
  const { used, stock } = req.body;
  if (used == null && stock == null) {
    return res.status(400).json({ error: 'Güncellenecek veri yok' });
  }
  let query = 'UPDATE chemicals SET ';
  const params = [];
  if (used != null) {
    query += 'used = ?';
    params.push(used);
  }
  if (stock != null) {
    if (params.length > 0) query += ', ';
    query += 'stock = ?';
    params.push(stock);
  }
  query += ' WHERE id = ?';
  params.push(id);
  try {
    db.prepare(query).run(...params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Harita işaretleri: Tümünü getir
app.get('/api/markers', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM markers').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Harita işareti ekle
app.post('/api/markers', (req, res) => {
  const { lat, lng, desc } = req.body;
  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  try {
    const stmt = db.prepare('INSERT INTO markers (lat, lng, desc) VALUES (?, ?, ?)');
    const info = stmt.run(lat, lng, desc || '');
    res.json({ id: info.lastInsertRowid, lat, lng, desc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Elle örnek ilaç verisi ekle
app.post('/api/chemicals/seed', (req, res) => {
  const defaultChemicals = [
    { name: 'Biyocyper', stock: 100, used: 0 },
    { name: 'Alfavek', stock: 80, used: 0 },
    { name: 'Protoks', stock: 60, used: 0 },
  ];
  let added = 0;
  try {
    const stmt = db.prepare('INSERT INTO chemicals (name, stock, used) VALUES (?, ?, ?)');
    defaultChemicals.forEach((chem) => {
      stmt.run(chem.name, chem.stock, chem.used);
      added++;
    });
    res.json({ success: true, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı ekle (seed)
app.post('/api/users/seed', (req, res) => {
  const defaultUsers = [
    { username: 'balya', password: 'balya123', fullname: 'Balya Kullanıcı' },
    { username: 'admin', password: 'admin123', fullname: 'Admin Kullanıcı' }
  ];
  let added = 0;
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO users (username, password, fullname) VALUES (?, ?, ?)');
    defaultUsers.forEach((user) => {
      stmt.run(user.username, user.password, user.fullname);
      added++;
    });
    res.json({ success: true, added });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Giriş endpointi
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
  }
  try {
    const row = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (!row) return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    addLog({ user_id: row.id, username: row.username, action: 'login', detail: 'Giriş yaptı' });
    res.json({ success: true, user: { id: row.id, username: row.username, fullname: row.fullname, role: row.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kaynak sil
app.delete('/api/resources/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kaynak güncelle
app.patch('/api/resources/:id', (req, res) => {
  const { id } = req.params;
  const { type, lat, lng, ilce, mahalle, adres, aciklama, tarih, resim, ilaclamaZamani, ilaclandiMi } = req.body;
  const fields = [];
  const values = [];
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (lat !== undefined) { fields.push('lat = ?'); values.push(lat); }
  if (lng !== undefined) { fields.push('lng = ?'); values.push(lng); }
  if (ilce !== undefined) { fields.push('ilce = ?'); values.push(ilce); }
  if (mahalle !== undefined) { fields.push('mahalle = ?'); values.push(mahalle); }
  if (adres !== undefined) { fields.push('adres = ?'); values.push(adres); }
  if (aciklama !== undefined) { fields.push('aciklama = ?'); values.push(aciklama); }
  if (tarih !== undefined) { fields.push('tarih = ?'); values.push(tarih); }
  if (resim !== undefined) { fields.push('resim = ?'); values.push(resim); }
  if (ilaclamaZamani !== undefined) { fields.push('ilaclamaZamani = ?'); values.push(ilaclamaZamani); }
  if (ilaclandiMi !== undefined) { fields.push('ilaclandiMi = ?'); values.push(ilaclandiMi); }
  if (fields.length === 0) return res.status(400).json({ error: 'Güncellenecek veri yok' });
  const sql = `UPDATE resources SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  try {
    db.prepare(sql).run(...values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı kayıt endpointi
app.post('/api/register', (req, res) => {
  const { fullname, username, password, role } = req.body;
  if (!fullname || !username || !password) {
    return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
  }
  try {
    const info = db.prepare('INSERT INTO users (fullname, username, password, role) VALUES (?, ?, ?, ?)').run(fullname, username, password, role || 'user');
    addLog({ user_id: info.lastInsertRowid, username, action: 'add', detail: 'Kullanıcı eklendi' });
    res.json({ success: true, user: { id: info.lastInsertRowid, fullname, username, role: role || 'user' } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Tüm kullanıcıları getir
app.get('/api/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, username, fullname, password, role, active FROM users').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı sil
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (user) addLog({ user_id: user.id, username: user.username, action: 'delete', detail: 'Kullanıcı silindi' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı adını (fullname) güncelle
app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { fullname } = req.body;
  if (!fullname) return res.status(400).json({ error: 'fullname gerekli' });
  try {
    db.prepare('UPDATE users SET fullname = ? WHERE id = ?').run(fullname, id);
    addLog({ user_id: id, username: '', action: 'update', detail: 'Ad güncellendi' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı şifresi güncelle
app.patch('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password gerekli' });
  try {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id);
    addLog({ user_id: id, username: '', action: 'reset_password', detail: 'Şifre güncellendi' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı aktif/pasif güncelle
app.patch('/api/users/:id/active', (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  if (active === undefined) return res.status(400).json({ error: 'active gerekli' });
  try {
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, id);
    addLog({ user_id: id, username: '', action: 'active', detail: `Kullanıcı ${active ? 'aktif' : 'pasif'} yapıldı` });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logları getir
app.get('/api/logs', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT 200').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Site ayarlarını getir
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Site ayarlarını güncelle
app.post('/api/settings', (req, res) => {
  const updates = req.body;
  const keys = Object.keys(updates);
  if (keys.length === 0) return res.status(400).json({ error: 'Ayar yok' });
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    keys.forEach(key => {
      stmt.run(key, updates[key]);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend API http://localhost:${PORT}`);
}); 
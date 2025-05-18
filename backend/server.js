const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Veritabanı dosyasını oluştur
const db = new sqlite3.Database(path.join(__dirname, 'data.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS resources (
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
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS chemicals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stock REAL NOT NULL,
    used REAL NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    desc TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    fullname TEXT,
    role TEXT DEFAULT 'user',
    active INTEGER DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
});

function addLog({ user_id, username, action, detail }) {
  db.run('INSERT INTO logs (user_id, username, action, detail) VALUES (?, ?, ?, ?)', [user_id, username, action, detail]);
}

// Tüm kaynakları getir
app.get('/api/resources', (req, res) => {
  db.all('SELECT * FROM resources', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Yeni kaynak ekle
app.post('/api/resources', (req, res) => {
  const { type, lat, lng, ilce, mahalle, adres, aciklama, tarih, resim } = req.body;
  if (!type || lat == null || lng == null) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  db.run(
    'INSERT INTO resources (type, lat, lng, ilce, mahalle, adres, aciklama, tarih, resim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [type, lat, lng, ilce || '', mahalle || '', adres || '', aciklama || '', tarih || '', resim || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, type, lat, lng, ilce, mahalle, adres, aciklama, tarih, resim });
    }
  );
});

// İlaçlar: Tümünü getir
app.get('/api/chemicals', (req, res) => {
  db.all('SELECT * FROM chemicals', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// İlaç ekle
app.post('/api/chemicals', (req, res) => {
  const { name, stock, used } = req.body;
  if (!name || stock == null || used == null) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  db.run('INSERT INTO chemicals (name, stock, used) VALUES (?, ?, ?)', [name, stock, used], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, stock, used });
  });
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
  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Harita işaretleri: Tümünü getir
app.get('/api/markers', (req, res) => {
  db.all('SELECT * FROM markers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Harita işareti ekle
app.post('/api/markers', (req, res) => {
  const { lat, lng, desc } = req.body;
  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'Eksik veri' });
  }
  db.run('INSERT INTO markers (lat, lng, desc) VALUES (?, ?, ?)', [lat, lng, desc || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, lat, lng, desc });
  });
});

// Elle örnek ilaç verisi ekle
app.post('/api/chemicals/seed', (req, res) => {
  const defaultChemicals = [
    { name: 'Biyocyper', stock: 100, used: 0 },
    { name: 'Alfavek', stock: 80, used: 0 },
    { name: 'Protoks', stock: 60, used: 0 },
  ];
  let added = 0;
  defaultChemicals.forEach((chem, idx) => {
    db.run('INSERT INTO chemicals (name, stock, used) VALUES (?, ?, ?)', [chem.name, chem.stock, chem.used], function(err) {
      if (!err) added++;
      if (idx === defaultChemicals.length - 1) {
        res.json({ success: true, added });
      }
    });
  });
});

// Kullanıcı ekle (seed)
app.post('/api/users/seed', (req, res) => {
  const defaultUsers = [
    { username: 'balya', password: 'balya123', fullname: 'Balya Kullanıcı' },
    { username: 'admin', password: 'admin123', fullname: 'Admin Kullanıcı' }
  ];
  let added = 0;
  defaultUsers.forEach((user, idx) => {
    db.run('INSERT OR IGNORE INTO users (username, password, fullname) VALUES (?, ?, ?)', [user.username, user.password, user.fullname], function(err) {
      if (!err) added++;
      if (idx === defaultUsers.length - 1) {
        res.json({ success: true, added });
      }
    });
  });
});

// Giriş endpointi
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
  }
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    addLog({ user_id: row.id, username: row.username, action: 'login', detail: 'Giriş yaptı' });
    res.json({ success: true, user: { id: row.id, username: row.username, fullname: row.fullname, role: row.role } });
  });
});

// Kaynak sil
app.delete('/api/resources/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM resources WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
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
  db.run(sql, values, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Kullanıcı kayıt endpointi
app.post('/api/register', (req, res) => {
  const { fullname, username, password, role } = req.body;
  if (!fullname || !username || !password) {
    return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
  }
  db.run('INSERT INTO users (fullname, username, password, role) VALUES (?, ?, ?, ?)', [fullname, username, password, role || 'user'], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      }
      return res.status(500).json({ error: err.message });
    }
    addLog({ user_id: this.lastID, username, action: 'add', detail: 'Kullanıcı eklendi' });
    res.json({ success: true, user: { id: this.lastID, fullname, username, role: role || 'user' } });
  });
});

// Tüm kullanıcıları getir
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, fullname, password, role, active FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Kullanıcı sil
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    db.run('DELETE FROM users WHERE id = ?', [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      if (user) addLog({ user_id: user.id, username: user.username, action: 'delete', detail: 'Kullanıcı silindi' });
      res.json({ success: true });
    });
  });
});

// Kullanıcı adını (fullname) güncelle
app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { fullname } = req.body;
  if (!fullname) return res.status(400).json({ error: 'fullname gerekli' });
  db.run('UPDATE users SET fullname = ? WHERE id = ?', [fullname, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    addLog({ user_id: id, username: '', action: 'update', detail: 'Ad güncellendi' });
    res.json({ success: true });
  });
});

// Kullanıcı şifresi güncelle
app.patch('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password gerekli' });
  db.run('UPDATE users SET password = ? WHERE id = ?', [password, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    addLog({ user_id: id, username: '', action: 'reset_password', detail: 'Şifre güncellendi' });
    res.json({ success: true });
  });
});

// Kullanıcı aktif/pasif güncelle
app.patch('/api/users/:id/active', (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  if (active === undefined) return res.status(400).json({ error: 'active gerekli' });
  db.run('UPDATE users SET active = ? WHERE id = ?', [active, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    addLog({ user_id: id, username: '', action: 'active', detail: `Kullanıcı ${active ? 'aktif' : 'pasif'} yapıldı` });
    res.json({ success: true });
  });
});

// Logları getir
app.get('/api/logs', (req, res) => {
  db.all('SELECT * FROM logs ORDER BY created_at DESC LIMIT 200', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Site ayarlarını getir
app.get('/api/settings', (req, res) => {
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  });
});

// Site ayarlarını güncelle
app.post('/api/settings', (req, res) => {
  const updates = req.body;
  const keys = Object.keys(updates);
  if (keys.length === 0) return res.status(400).json({ error: 'Ayar yok' });
  let done = 0;
  keys.forEach(key => {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, updates[key]], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      done++;
      if (done === keys.length) res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend API http://localhost:${PORT}`);
}); 
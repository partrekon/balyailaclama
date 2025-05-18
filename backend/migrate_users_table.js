const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data.db'));

function addColumnIfNotExists(table, column, type, cb) {
  db.all(`PRAGMA table_info(${table})`, (err, columns) => {
    if (err) return cb(err);
    if (columns.some(col => col.name === column)) return cb();
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, cb);
  });
}

addColumnIfNotExists('users', 'role', "TEXT DEFAULT 'user'", (err) => {
  if (err) console.error('role eklenemedi:', err.message);
  else console.log('role sütunu eklendi veya zaten var.');
  addColumnIfNotExists('users', 'active', 'INTEGER DEFAULT 1', (err2) => {
    if (err2) console.error('active eklenemedi:', err2.message);
    else console.log('active sütunu eklendi veya zaten var.');
    // Mustafa Erdem'i admin yap
    db.run("UPDATE users SET role = 'admin' WHERE username = 'mustafa'", function(err3) {
      if (err3) console.error('Mustafa admin yapılamadı:', err3.message);
      else console.log('Mustafa Erdem (mustafa) artık admin!');
      db.close();
    });
  });
}); 
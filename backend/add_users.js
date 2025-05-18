const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

const users = [
  ['Mustafa Erdem','mustafa','mustafa123'],
  ['Şeyma Şef','seyma','seyma123'],
  ['Cihan Güler','cihan','cihan123'],
  ['Güven Gaga','guven','guven123'],
  ['Muhterem Sazan','muhterem','muhterem123'],
  ['Ahmet Baysal','ahmet','ahmet123']
];

users.forEach(([fullname, username, password]) => {
  db.run('INSERT OR REPLACE INTO users (id, fullname, username, password) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, ?)', [username, fullname, username, password], function(err) {
    if (err) {
      console.error(`Hata: ${fullname} (${username}) eklenemedi:`, err.message);
    } else {
      console.log(`Eklendi/Güncellendi: ${fullname} (${username})`);
    }
  });
});

db.close(); 
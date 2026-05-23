import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin';

const dbPath = path.join(process.cwd(), '.data', 'd1.sqlite');
const db = new Database(dbPath);

const hash = crypto.createHash('sha512').update(password).digest('hex');

db.prepare(`
  INSERT INTO admins (username, password_sha512) 
  VALUES (?, ?)
  ON CONFLICT(username) DO UPDATE SET password_sha512=excluded.password_sha512
`).run(username, hash);

console.log(`✅ Админ-пользователь '${username}' успешно добавлен/обновлен с новым паролем!`);

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

async function main() {
  const username = process.argv[2] || 'admin';
  let password = process.argv[3];

  if (!password) {
    const rl = readline.createInterface({ input, output });
    password = await rl.question(`Пароль для админа '${username}': `);
    rl.close();
  }
  
  if (!password) {
    console.error("❌ Ошибка: пароль не может быть пустым.");
    process.exit(1);
  }

  const dbPath = path.join(process.cwd(), '.data', 'd1.sqlite');
  const db = new Database(dbPath);

  const hash = crypto.createHash('sha512').update(password).digest('hex');

  db.prepare(`
    INSERT INTO admins (username, password_sha512) 
    VALUES (?, ?)
    ON CONFLICT(username) DO UPDATE SET password_sha512=excluded.password_sha512
  `).run(username, hash);

  console.log(`✅ Админ-пользователь '${username}' успешно добавлен/обновлен с новым паролем!`);
}

main();

import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const files = fs.readdirSync(dataDir);

// Regex check for characters outside ASCII + Cyrillic
const isMojibake = (str: string) => /[^\x00-\x7F\u0400-\u04FF\s\-.,_]/.test(str);

const badFiles = files.filter(isMojibake);

console.log('Found ' + badFiles.length + ' bad files.');

for (const file of badFiles) {
  const filePath = path.join(dataDir, file);
  console.log('Deleting: ', file);
  fs.unlinkSync(filePath);
}

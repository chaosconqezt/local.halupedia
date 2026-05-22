import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

fs.rmSync('/app/applet/src', { recursive: true, force: true });
fs.mkdirSync('/app/applet/src');
copyDir('/app/applet/halupedia_extracted/halupedia/src/client', '/app/applet/src');
copyDir('/app/applet/halupedia_extracted/halupedia/src/worker', '/app/applet/server');

console.log('Copied successfully!');

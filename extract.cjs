const AdmZip = require('adm-zip');
const zip = new AdmZip('halupedia.zip');
zip.extractAllTo('halupedia_extracted', true);
console.log('Extracted successfully');

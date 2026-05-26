const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, 'LanguageContext-new.tsx');
const dstFile = path.join(__dirname, 'src/app/context/LanguageContext.tsx');

const content = fs.readFileSync(srcFile, 'utf-8');
fs.writeFileSync(dstFile, content, 'utf-8');
console.log('Updated LanguageContext.tsx with new translations');

// Clean up temp file
fs.unlinkSync(srcFile);
console.log('Cleaned up temp file');

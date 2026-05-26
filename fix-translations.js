const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'LanguageContext-new.tsx');
const dst = path.join(__dirname, 'src/app/context/LanguageContext.tsx');

try {
  const content = fs.readFileSync(src, 'utf-8');
  fs.writeFileSync(dst, content, 'utf-8');
  console.log('✓ Successfully replaced LanguageContext.tsx');
  
  // Clean up temp file
  fs.unlinkSync(src);
  console.log('✓ Cleaned up temp file');
  console.log('\nThe syntax error is fixed. You can restart the dev server now.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}

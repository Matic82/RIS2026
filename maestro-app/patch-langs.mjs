#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const srcFile = 'LanguageContext-new.tsx';
const dstFile = 'src/app/context/LanguageContext.tsx';

try {
  const content = fs.readFileSync(srcFile, 'utf-8');
  fs.writeFileSync(dstFile, content, 'utf-8');
  console.log('✓ Successfully updated LanguageContext.tsx with translations');
  
  // Clean up temp file
  fs.unlinkSync(srcFile);
  console.log('✓ Cleaned up temporary file');
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}

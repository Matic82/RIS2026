const fs = require('fs');
const file = 'src/app/context/LanguageContext.tsx';
let content = fs.readFileSync(file, 'utf8');

const insertAfter = "'member.purchases.howCalculated': { en: 'How Points Are Calculated', sl: 'Kako se izračunajo točke' },";
const newLines = `'member.purchases.howCalculatedDesc': {
    en: 'Points are calculated based on your monthly purchase totals and your loyalty tier at the time of purchase. Higher tiers earn more points per euro spent. Points are automatically calculated and added at the end of each month.',
    sl: 'Točke se izračunajo na osnovi vaših mesečnih nakupov in statusa zvestobe ob času nakupa. Višji statusi prinesejo več točk na evro porabljenega denarja. Točke se samodejno izračunajo in dodelijo na koncu vsakega meseca.',
  },`;

if (content.includes(insertAfter)) {
  content = content.replace(insertAfter, insertAfter + '\n  ' + newLines);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✓ Translation added successfully!');
} else {
  console.log('✗ Could not find insertion point');
}

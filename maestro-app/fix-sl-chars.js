const fs = require('fs');

const file = 'src/app/context/LanguageContext.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace bad translations with good ones
const replacements = [
  ['Vnesite svojo e-postni naslov in poslali vam bomo povezavo za ponastavitev gesla.', "Vnesite svojo e-poštni naslov in poslali vam bomo povezavo za ponastavitev gesla."],
  ['Poljji povezavo za ponastavitev', 'Pošlji povezavo za ponastavitev'],
  ['Preverite e-posto', 'Preverite e-pošto'],
  ['Ce obstaja racun s to e-posto, boste prejeli povezavo za ponastavitev gesla.', 'Če obstaja račun s to e-pošto, boste prejeli povezavo za ponastavitev gesla.'],
  ['Povezava preneha veljati chez 24 ur.', 'Povezava preneha veljati čez 24 ur.'],
  ['Poskusi drugem e-posto', 'Poskusi drugem e-pošto'],
  ['Geslo uspesno ponastavljen!', 'Geslo uspešno ponastavljen!'],
  ['Preusmerjam na stran za prijavo...', 'Preusmerjam na stran za prijavo...'],
];

replacements.forEach(([from, to]) => {
  content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
});

fs.writeFileSync(file, content, 'utf-8');
console.log('✓ Fixed Slovenian diacritics in translations');

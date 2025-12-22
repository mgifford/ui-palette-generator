const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'src', 'data');
fs.mkdirSync(outDir, { recursive: true });

const tokens = {
  tokens: [
    { name: 'uswds-blue-100', hex: '#112233' }
  ]
};

fs.writeFileSync(path.join(outDir, 'uswds-tokens.json'), JSON.stringify(tokens, null, 2));
console.log('Wrote src/data/uswds-tokens.json');

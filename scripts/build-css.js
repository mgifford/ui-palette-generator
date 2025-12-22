const fs = require('fs');
const path = require('path');
const sass = require('sass');

const srcPath = path.join(__dirname, '..', 'css', 'main.scss');
const outPath = path.join(__dirname, '..', 'docs', 'css', 'main.css');

let content = fs.readFileSync(srcPath, 'utf8');

// Remove Jekyll-style front-matter if present at the top of the file
if (content.startsWith('---')) {
  const parts = content.split(/\r?\n/);
  // find the second '---' delimiter
  let secondIndex = -1;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].trim() === '---') { secondIndex = i; break; }
  }
  if (secondIndex !== -1) {
    content = parts.slice(secondIndex + 1).join('\n');
  }
}

const result = sass.renderSync({
  data: content,
  outputStyle: 'compressed',
  includePaths: [path.join(__dirname, '..', '_sass')]
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, result.css);
console.log('Wrote', outPath);

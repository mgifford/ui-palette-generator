const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'index.html');
const includesDir = path.join(__dirname, '..', '_includes');
const imagesDir = path.join(__dirname, '..', 'images');
const outPath = path.join(__dirname, '..', 'docs', 'index.html');

const hasSourceIndex = fs.existsSync(srcPath);
let content = '';

if (!hasSourceIndex) {
  console.warn('Skipping HTML build: no root index.html found. docs/index.html is treated as the source of truth.');
} else {
  content = fs.readFileSync(srcPath, 'utf8');

// Helper to inline includes with attributes and recursion
function inlineIncludes(text, baseDir) {
  return text.replace(/\{%\s*include\s+([^\s%]+)([^%]*)%\}/g, (match, filename, attrs) => {
    const incPath = path.join(baseDir, filename);
    if (!fs.existsSync(incPath)) {
      console.warn('Missing include file:', filename);
      return '';
    }
    let incContent = fs.readFileSync(incPath, 'utf8');

    // parse attributes like id="seed"
    const attrMap = {};
    (attrs || '').trim().replace(/([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g, (_, k, v) => { attrMap[k] = v; });

    // Replace simple Liquid-style include variables like {{ include.id }}
    incContent = incContent.replace(/\{\{\s*include\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return attrMap[key] || '';
    });

    // Recurse into nested includes
    incContent = inlineIncludes(incContent, baseDir);
    return incContent;
  });
}

  // Remove Jekyll front-matter if present
  if (content.startsWith('---')) {
    const parts = content.split(/\r?\n/);
    let secondIndex = -1;
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].trim() === '---') { secondIndex = i; break; }
    }
    if (secondIndex !== -1) {
      content = parts.slice(secondIndex + 1).join('\n');
    }
  }

  // Inline all includes and support attributes and nested includes
  content = inlineIncludes(content, includesDir);

  // Also replace any remaining {{ include.xxx }} in the main file with empty string
  content = content.replace(/\{\{\s*include\.[^}]+\s*\}\}/g, '');

  // Optionally strip Google Analytics from local builds to avoid blocked requests
  const keepGa = process.env.NODE_ENV === 'production' || process.env.KEEP_GA === '1';
  if (!keepGa) {
    // Remove the external gtag.js script tag and the inline gtag config block
    content = content.replace(/<script[^>]*src=["']https:\/\/www\.googletagmanager\.com\/gtag\.js[^>]*>[^<]*<\/script>\s*/g, '');
    content = content.replace(/<script>\s*window\.dataLayer[\s\S]*?gtag\([\s\S]*?<\/script>\s*/g, '');
  }

  // Ensure docs directory exists
  fs.mkdirSync(path.join(__dirname, '..', 'docs'), { recursive: true });

  // Write the processed index.html
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('Wrote', outPath);
}

// Copy images directory to docs/images if present
if (fs.existsSync(imagesDir)) {
  const dest = path.join(__dirname, '..', 'docs', 'images');
  // Node 16+ has fs.cpSync
  try {
    fs.rmSync(dest, { recursive: true, force: true });
  } catch (e) {}
  fs.cpSync(imagesDir, dest, { recursive: true });
  console.log('Copied images to', dest);
}

// As a fallback, also strip common Google Analytics snippets from the generated file
try {
  const out = fs.readFileSync(outPath, 'utf8');
  let sanitized = out.replace(/<script[^>]*googletagmanager\.com[\s\S]*?<\/script>/g, '');
  sanitized = sanitized.replace(/<script[^>]*gtag\([\s\S]*?<\/script>/g, '');
  sanitized = sanitized.replace(/<!-- Google Analytics[\s\S]*?-->/g, '');
  // Strip google fonts references
  sanitized = sanitized.replace(/<link[^>]*fonts.googleapis.com[\s\S]*?>/g, '');
  if (sanitized !== out) {
    fs.writeFileSync(outPath, sanitized, 'utf8');
    console.log('Stripped Google Analytics from', outPath);
  }
} catch (e) {
  // ignore
}

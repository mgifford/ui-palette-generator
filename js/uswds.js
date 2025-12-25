import chroma from 'chroma-js';

let USWDS_COLORS = [];

export async function loadUswds(path = 'uswds/uswds-system-color-tokens.csv') {
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    const text = await res.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    const header = rows.shift().split(',');
    const tokenIdx = header.indexOf('token');
    const hexIdx = header.indexOf('hex');
    USWDS_COLORS = rows.map(function(r){
      const cells = r.split(',');
      return { token: cells[tokenIdx], hex: (cells[hexIdx] || '').trim().toUpperCase() };
    }).filter(c=>c.hex);
    return USWDS_COLORS;
  } catch (e) {
    return [];
  }
}

function oklchDistance(a, b) {
  // Perceptual distance using OKLCH; weights hue by chroma to avoid hue swing at low saturation
  const dl = a[0] - b[0];
  const dc = a[1] - b[1];
  const dh = (a[2] - b[2]) * (Math.min(a[1], b[1]) + 0.01);
  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}

export function snapToUswds(hex) {
  if (!USWDS_COLORS || !USWDS_COLORS.length) return hex;
  let best = null;
  let bestDist = Infinity;
  try {
    const lchA = chroma(hex).oklch();
    USWDS_COLORS.forEach(function(c){
      try {
        const lchB = chroma(c.hex).oklch();
        const d = oklchDistance(lchA, lchB);
        if (d < bestDist) { bestDist = d; best = c; }
      } catch(e){}
    });
  } catch (e) { return hex; }
  return best ? best.hex : hex;
}

export function getUswdsList() { return USWDS_COLORS; }

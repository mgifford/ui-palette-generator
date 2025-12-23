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

function labDistance(a, b) {
  return Math.sqrt(Math.pow(a[0]-b[0],2) + Math.pow(a[1]-b[1],2) + Math.pow(a[2]-b[2],2));
}

export function snapToUswds(hex) {
  if (!USWDS_COLORS || !USWDS_COLORS.length) return hex;
  let best = null;
  let bestDist = Infinity;
  try {
    const labA = chroma(hex).lab();
    USWDS_COLORS.forEach(function(c){
      try {
        const labB = chroma(c.hex).lab();
        const d = labDistance(labA, labB);
        if (d < bestDist) { bestDist = d; best = c; }
      } catch(e){}
    });
  } catch (e) { return hex; }
  return best ? best.hex : hex;
}

export function getUswdsList() { return USWDS_COLORS; }

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
    const familyIdx = header.indexOf('family');
    const gradeIdx = header.indexOf('grade');
    const variantIdx = header.indexOf('variant');
    USWDS_COLORS = rows.map(function(r){
      const cells = r.split(',');
      const token = cells[tokenIdx];
      const hex = (cells[hexIdx] || '').trim().toUpperCase();
      const family = (familyIdx >= 0 ? (cells[familyIdx] || '').trim() : null);
      const grade = (gradeIdx >= 0 ? parseInt((cells[gradeIdx] || '').trim(), 10) : null);
      const variant = (variantIdx >= 0 ? (cells[variantIdx] || '').trim() : '');
      return { token, hex, family, grade, variant };
    }).filter(c=>c.hex);
    return USWDS_COLORS;
  } catch (e) {
    return [];
  }
}

function parseUswdsToken(token) {
  if (!token) return null;
  const match = token.match(/^([a-z-]+)-(\d{1,3})(v?)$/i);
  if (!match) return null;
  return { family: match[1], grade: parseInt(match[2], 10), variant: match[3] || '' };
}

function findTokenByName(name) {
  return (USWDS_COLORS || []).find(function(c){ return c && c.token === name; }) || null;
}

export function findTokenByHex(hex) {
  const target = (hex || '').trim().toUpperCase();
  if (!target) return null;
  return (USWDS_COLORS || []).find(function(c){ return c && c.hex === target; }) || null;
}

export function getParsedToken(tokenOrHex) {
  const base = findTokenByHex(tokenOrHex) || findTokenByName(tokenOrHex);
  if (!base) return null;
  const parsed = parseUswdsToken(base.token);
  if (!parsed) return null;
  return { ...parsed, token: base.token, hex: base.hex };
}

function findNearestSibling(parsed, preferredSteps = [-10, 10]) {
  if (!parsed) return null;
  const variantSuffix = parsed.variant ? 'v' : '';
  const grades = Array.isArray(preferredSteps) && preferredSteps.length ? preferredSteps : [-10, 10];

  for (let i = 0; i < grades.length; i += 1) {
    const candidateGrade = parsed.grade + grades[i];
    if (candidateGrade <= 0) continue;
    const candidateName = `${parsed.family}-${candidateGrade}${variantSuffix}`;
    const direct = findTokenByName(candidateName);
    if (direct) return direct;
  }

  const siblings = (USWDS_COLORS || []).map(function(c){
    const p = parseUswdsToken(c && c.token);
    if (!p) return null;
    if (p.family !== parsed.family || p.variant !== parsed.variant) return null;
    if (p.grade === parsed.grade) return null;
    return { token: c.token, hex: c.hex, grade: p.grade };
  }).filter(Boolean);

  if (!siblings.length) return null;

  siblings.sort(function(a, b){
    const diffA = Math.abs(a.grade - parsed.grade);
    const diffB = Math.abs(b.grade - parsed.grade);
    if (diffA === diffB) return a.grade - b.grade; // prefer the slightly lighter option when distances tie
    return diffA - diffB;
  });
  return siblings[0];
}

export function suggestSubduedFromStrong(strongTokenOrHex) {
  const base = findTokenByHex(strongTokenOrHex) || findTokenByName(strongTokenOrHex);
  if (!base) return null;
  const parsed = parseUswdsToken(base.token);
  if (!parsed) return null;
  const sibling = findNearestSibling(parsed, [-10, 10]); // prefer one step lighter than strong
  return sibling ? sibling.hex : null;
}

function findSiblingBelow(parsedBase, opts = {}) {
  if (!parsedBase) return null;
  const { minDelta = 10, maxDelta = null } = opts;
  const siblings = (USWDS_COLORS || []).map(function(c){
    const p = parseUswdsToken(c && c.token);
    if (!p) return null;
    if (p.family !== parsedBase.family || p.variant !== parsedBase.variant) return null;
    const delta = parsedBase.grade - p.grade; // positive when sibling is lighter grade number
    if (delta <= 0) return null;
    return { token: c.token, hex: c.hex, grade: p.grade, delta: delta };
  }).filter(Boolean);

  if (!siblings.length) return null;

  const filtered = siblings.filter(function(s){
    const meetsMin = s.delta >= minDelta;
    const meetsMax = maxDelta === null ? true : s.delta <= maxDelta;
    return meetsMin && meetsMax;
  });

  const candidates = filtered.length ? filtered : siblings.filter(function(s){ return s.delta >= minDelta; });
  if (!candidates.length) return null;

  candidates.sort(function(a, b){
    if (a.delta === b.delta) return a.grade - b.grade;
    return a.delta - b.delta; // prefer closest that meets minDelta
  });
  return candidates[0];
}

export function suggestToneBelow(strongTokenOrHex, options = {}) {
  const parsed = getParsedToken(strongTokenOrHex);
  if (!parsed) return null;
  const sibling = findSiblingBelow(parsed, options);
  return sibling ? sibling.hex : null;
}

export function suggestSoftBelow(subduedTokenOrHex, options = {}) {
  const { minDelta = 40, maxDelta = null } = options;
  return suggestToneBelow(subduedTokenOrHex, { minDelta, maxDelta });
}

export function gradeDelta(strongTokenOrHex, subduedTokenOrHex) {
  const strong = getParsedToken(strongTokenOrHex);
  const subdued = getParsedToken(subduedTokenOrHex);
  if (!strong || !subdued) return null;
  if (strong.family !== subdued.family || strong.variant !== subdued.variant) return null;
  return strong.grade - subdued.grade; // positive when subdued is lighter
}

function oklchDistance(a, b) {
  // Perceptual distance using OKLCH; weights hue by chroma to avoid hue swing at low saturation
  const dl = a[0] - b[0];
  const dc = a[1] - b[1];
  const dh = (a[2] - b[2]) * (Math.min(a[1], b[1]) + 0.01);
  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}

export function snapToUswds(hex, opts = {}) {
  const { allowedFamilies = null } = opts || {};
  if (!USWDS_COLORS || !USWDS_COLORS.length) return hex;
  let best = null;
  let bestDist = Infinity;
  try {
    const lchA = chroma(hex).oklch();
    const pool = Array.isArray(allowedFamilies) && allowedFamilies.length
      ? USWDS_COLORS.filter(function(c){ return c.family && allowedFamilies.includes(c.family); })
      : USWDS_COLORS;
    pool.forEach(function(c){
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

function nearestGradeCandidate(candidates, targetGrade) {
  if (!candidates || !candidates.length) return null;
  const tg = parseInt(targetGrade, 10);
  const sorted = candidates
    .filter(function(c){ return typeof c.grade === 'number' && !Number.isNaN(c.grade); })
    .sort(function(a,b){
      const da = Math.abs(a.grade - tg);
      const db = Math.abs(b.grade - tg);
      if (da === db) return a.grade - b.grade;
      return da - db;
    });
  return sorted[0] || null;
}

export function suggestGradeForBaseFamily(baseTokenOrHex, targetGrade) {
  const base = getParsedToken(baseTokenOrHex);
  if (!base) return null;
  const fam = base.family;
  const variant = base.variant;
  const candidates = (USWDS_COLORS || []).filter(function(c){
    if (!c.family || c.family !== fam) return false;
    // keep variant alignment if present (e.g., vivid)
    const cv = (c.variant || '').toString();
    const bv = (variant || '').toString();
    if (bv && cv !== bv) return false;
    return true;
  });
  const chosen = nearestGradeCandidate(candidates, targetGrade);
  return chosen ? chosen.hex : null;
}

export function suggestNeutralAtGrade(targetGrade) {
  const families = ['gray','gray-cool','gray-warm'];
  const candidates = (USWDS_COLORS || []).filter(function(c){
    return c.family && families.includes(c.family);
  });
  const chosen = nearestGradeCandidate(candidates, targetGrade);
  return chosen ? chosen.hex : null;
}

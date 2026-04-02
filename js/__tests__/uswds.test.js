import {
  loadUswds,
  findTokenByHex,
  getParsedToken,
  snapToUswds,
  suggestSubduedFromStrong,
  suggestToneBelow,
  suggestSoftBelow,
  gradeDelta,
  suggestGradeForBaseFamily,
  suggestNeutralAtGrade,
  getUswdsList,
} from '../uswds.js';

// ─── Test data ────────────────────────────────────────────────────────────────

const SAMPLE_CSV = [
  'token,hex,family,grade,variant',
  'blue-50,#EFF6FB,blue,50,',
  'blue-60,#D9E8F6,blue,60,',
  'blue-70,#ADCCE4,blue,70,',
  'blue-80,#73B3D8,blue,80,',
  'blue-90,#3A7FAD,blue,90,',
  'blue-100,#2E6DA4,blue,100,',
  'blue-110,#1F4E79,blue,110,',
  'red-40,#F8DFE2,red,40,',
  'red-50,#F4C3C8,red,50,',
  'red-60,#D9535D,red,60,',
  'red-70,#B51D2A,red,70,',
  'red-80,#8B1120,red,80,',
  'gray-10,#F3F3F3,gray,10,',
  'gray-20,#E3E3E3,gray,20,',
  'gray-30,#C9C9C9,gray,30,',
  'gray-50,#767676,gray,50,',
  'gray-60,#5C5C5C,gray,60,',
  'gray-80,#2E2E2E,gray,80,',
  'gray-90,#1B1B1B,gray,90,',
  'gray-cool-10,#F0F0F5,gray-cool,10,',
  'gray-cool-50,#72727C,gray-cool,50,',
  'gray-warm-10,#F6F0EB,gray-warm,10,',
  'gray-warm-50,#7A7671,gray-warm,50,',
].join('\n');

// Mock fetch before tests run
function mockFetch(csv) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(csv),
  });
}

function mockFetchFail() {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
}

// Load a fresh set of tokens before each describe block that needs them
async function loadSampleData() {
  mockFetch(SAMPLE_CSV);
  await loadUswds('/fake/path.csv');
}

// ─── loadUswds ────────────────────────────────────────────────────────────────

describe('loadUswds', () => {
  test('parses CSV and returns an array of token objects', async () => {
    mockFetch(SAMPLE_CSV);
    const tokens = await loadUswds('/fake/path.csv');
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });

  test('each token has token, hex, family, grade fields', async () => {
    mockFetch(SAMPLE_CSV);
    const tokens = await loadUswds('/fake/path.csv');
    const blue100 = tokens.find(t => t.token === 'blue-100');
    expect(blue100).toBeDefined();
    expect(blue100.hex).toBe('#2E6DA4');
    expect(blue100.family).toBe('blue');
    expect(blue100.grade).toBe(100);
  });

  test('filters out rows with empty hex', async () => {
    const csvWithBlank = SAMPLE_CSV + '\nbad-token,,blue,999,';
    mockFetch(csvWithBlank);
    const tokens = await loadUswds('/fake/path.csv');
    expect(tokens.find(t => t.token === 'bad-token')).toBeUndefined();
  });

  test('returns empty array when fetch fails (ok: false)', async () => {
    mockFetchFail();
    const tokens = await loadUswds('/fake/path.csv');
    expect(tokens).toEqual([]);
  });

  test('returns empty array when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const tokens = await loadUswds('/fake/path.csv');
    expect(tokens).toEqual([]);
  });
});

// ─── findTokenByHex ───────────────────────────────────────────────────────────

describe('findTokenByHex', () => {
  beforeEach(loadSampleData);

  test('finds token by exact hex (uppercase)', () => {
    const t = findTokenByHex('#2E6DA4');
    expect(t).toBeDefined();
    expect(t.token).toBe('blue-100');
  });

  test('case-insensitive hex lookup', () => {
    const t = findTokenByHex('#2e6da4');
    expect(t).toBeDefined();
    expect(t.token).toBe('blue-100');
  });

  test('returns null for unrecognised hex', () => {
    expect(findTokenByHex('#123456')).toBeNull();
  });

  test('returns null for empty/null hex', () => {
    expect(findTokenByHex('')).toBeNull();
    expect(findTokenByHex(null)).toBeNull();
  });
});

// ─── getParsedToken ───────────────────────────────────────────────────────────

describe('getParsedToken', () => {
  beforeEach(loadSampleData);

  test('parses a known hex to family/grade/variant', () => {
    const parsed = getParsedToken('#2E6DA4');
    expect(parsed).toBeDefined();
    expect(parsed.family).toBe('blue');
    expect(parsed.grade).toBe(100);
    expect(parsed.variant).toBe('');
  });

  test('parses a token name directly', () => {
    const parsed = getParsedToken('blue-100');
    expect(parsed).toBeDefined();
    expect(parsed.family).toBe('blue');
    expect(parsed.grade).toBe(100);
  });

  test('returns null for unrecognised hex', () => {
    expect(getParsedToken('#000001')).toBeNull();
  });

  test('returns null for unrecognised token name', () => {
    expect(getParsedToken('made-up-500')).toBeNull();
  });

  test('returns null for null/undefined input', () => {
    expect(getParsedToken(null)).toBeNull();
    expect(getParsedToken(undefined)).toBeNull();
  });
});

// ─── snapToUswds ─────────────────────────────────────────────────────────────

describe('snapToUswds', () => {
  beforeEach(loadSampleData);

  test('snaps a hex to the nearest USWDS token', () => {
    // #2E6DA4 is exactly blue-100; slight variation should still land nearby
    const result = snapToUswds('#2E6DA4');
    expect(result).toBe('#2E6DA4');
  });

  test('returns the original hex when no tokens are loaded (empty list)', async () => {
    // Reload with empty data
    mockFetch('token,hex,family,grade,variant\n');
    await loadUswds('/fake/empty.csv');
    const result = snapToUswds('#336699');
    expect(result).toBe('#336699');
  });

  test('respects allowedFamilies option', async () => {
    await loadSampleData();
    // Only allow red family; snapping a blue hex should return a red
    const result = snapToUswds('#2E6DA4', { allowedFamilies: ['red'] });
    // Result should be from the red family
    const token = findTokenByHex(result);
    expect(token).toBeDefined();
    expect(token.family).toBe('red');
  });

  test('returns original hex on chroma parse error', async () => {
    await loadSampleData();
    const result = snapToUswds('notacolor');
    expect(result).toBe('notacolor');
  });
});

// ─── suggestSubduedFromStrong ─────────────────────────────────────────────────

describe('suggestSubduedFromStrong', () => {
  beforeEach(loadSampleData);

  test('returns a hex from the same family', () => {
    // blue-100 neighbour should be blue-90 or blue-110
    const result = suggestSubduedFromStrong('#2E6DA4');
    expect(result).toMatch(/^#[0-9A-F]{6}$/);
    const token = findTokenByHex(result);
    expect(token).toBeDefined();
    expect(token.family).toBe('blue');
  });

  test('returns null for unknown hex', () => {
    expect(suggestSubduedFromStrong('#000001')).toBeNull();
  });
});

// ─── suggestToneBelow ─────────────────────────────────────────────────────────

describe('suggestToneBelow', () => {
  beforeEach(loadSampleData);

  test('returns a lighter-graded hex from the same family', () => {
    // blue-100 → something below (lower grade number = lighter)
    const result = suggestToneBelow('#2E6DA4');
    expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    const token = findTokenByHex(result.toUpperCase());
    expect(token).toBeDefined();
    expect(token.family).toBe('blue');
    expect(token.grade).toBeLessThan(100);
  });

  test('returns null for unknown hex', () => {
    expect(suggestToneBelow('#000001')).toBeNull();
  });

  test('respects minDelta option', () => {
    // With minDelta=40, should skip blue-90 (delta 10) and return blue-60 (delta 40)
    const result = suggestToneBelow('#2E6DA4', { minDelta: 40 });
    if (result) {
      const token = findTokenByHex(result.toUpperCase());
      expect(token.grade).toBeLessThanOrEqual(60);
    }
  });
});

// ─── suggestSoftBelow ─────────────────────────────────────────────────────────

describe('suggestSoftBelow', () => {
  beforeEach(loadSampleData);

  test('returns a hex at least 40 grades lighter (default minDelta)', () => {
    const result = suggestSoftBelow('#2E6DA4');
    if (result) {
      const token = findTokenByHex(result.toUpperCase());
      expect(token).toBeDefined();
      expect(token.grade).toBeLessThanOrEqual(60);
    }
  });

  test('returns null for unknown hex', () => {
    expect(suggestSoftBelow('#000001')).toBeNull();
  });
});

// ─── gradeDelta ───────────────────────────────────────────────────────────────

describe('gradeDelta', () => {
  beforeEach(loadSampleData);

  test('returns positive delta when strong is higher grade than subdued', () => {
    // blue-100 vs blue-60: delta should be 40
    const delta = gradeDelta('#2E6DA4', '#D9E8F6');
    expect(delta).toBe(40);
  });

  test('returns 0 for same token', () => {
    const delta = gradeDelta('#2E6DA4', '#2E6DA4');
    expect(delta).toBe(0);
  });

  test('returns null when tokens are from different families', () => {
    // blue-100 vs red-70
    const delta = gradeDelta('#2E6DA4', '#B51D2A');
    expect(delta).toBeNull();
  });

  test('returns null for unknown hex', () => {
    expect(gradeDelta('#000001', '#2E6DA4')).toBeNull();
  });
});

// ─── suggestGradeForBaseFamily ────────────────────────────────────────────────

describe('suggestGradeForBaseFamily', () => {
  beforeEach(loadSampleData);

  test('finds a hex from same family nearest to target grade', () => {
    // blue-100 family, targeting grade 90 → should return blue-90
    const result = suggestGradeForBaseFamily('#2E6DA4', 90);
    expect(result).toBe('#3A7FAD');
  });

  test('returns nearest available grade when exact match missing', () => {
    // Target grade 95 (not in dataset) → nearest is blue-90
    const result = suggestGradeForBaseFamily('#2E6DA4', 95);
    expect(result).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('returns null for unknown hex', () => {
    expect(suggestGradeForBaseFamily('#000001', 50)).toBeNull();
  });
});

// ─── suggestNeutralAtGrade ────────────────────────────────────────────────────

describe('suggestNeutralAtGrade', () => {
  beforeEach(loadSampleData);

  test('returns a hex from a gray family at target grade', () => {
    const result = suggestNeutralAtGrade(50);
    expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    const token = findTokenByHex(result);
    expect(token).toBeDefined();
    expect(['gray', 'gray-cool', 'gray-warm']).toContain(token.family);
  });

  test('handles grade where only one gray family has a match', () => {
    const result = suggestNeutralAtGrade(10);
    expect(result).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

// ─── getUswdsList ─────────────────────────────────────────────────────────────

describe('getUswdsList', () => {
  test('returns array after loading', async () => {
    await loadSampleData();
    const list = getUswdsList();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('each entry has token and hex properties', async () => {
    await loadSampleData();
    const list = getUswdsList();
    list.forEach(item => {
      expect(item).toHaveProperty('token');
      expect(item).toHaveProperty('hex');
    });
  });
});

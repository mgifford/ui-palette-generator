#!/usr/bin/env node
/*
 * Playwright + axe-core scan for key pages.
 * Fails on serious/critical issues, warns on moderate.
 */
const { chromium } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { URL } = require('url');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const pagePaths = (process.env.A11Y_PAGES || '/,/HASH_FORMAT.html,/SPLIT_DEBUG.html')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const visitTimeoutMs = 20000;
const settleMs = 400;
const maxGotoAttempts = 3;

async function gotoWithRetry(page, url) {
  for (let attempt = 1; attempt <= maxGotoAttempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: visitTimeoutMs });
      return;
    } catch (err) {
      if (attempt === maxGotoAttempts) {
        throw new Error(`Failed to load ${url} after ${maxGotoAttempts} attempts: ${err.message}`);
      }
      await page.waitForTimeout(500 * attempt);
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const summary = [];
  let hasBlockingIssue = false;

  try {
    for (const path of pagePaths) {
      const targetUrl = new URL(path, baseUrl).toString();
      await gotoWithRetry(page, targetUrl);
      await page.waitForTimeout(settleMs);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const violations = (results.violations || []).map((violation) => ({
        id: violation.id,
        impact: violation.impact || 'unknown',
        description: violation.description,
        help: violation.help,
        nodes: violation.nodes.map((n) => n.target.join(' ')),
      }));

      const seriousOrAbove = violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      const moderate = violations.filter((v) => v.impact === 'moderate');

      if (seriousOrAbove.length > 0) {
        hasBlockingIssue = true;
      }

      summary.push({ path, url: targetUrl, seriousOrAbove, moderate, violations });
    }
  } finally {
    await browser.close();
  }

  // Structured reporting
  for (const pageResult of summary) {
    console.log(`\n[axe] Page: ${pageResult.url}`);
    if (pageResult.violations.length === 0) {
      console.log('  ✓ No violations found');
      continue;
    }

    if (pageResult.seriousOrAbove.length) {
      console.error('  Blocking (serious/critical):');
      for (const issue of pageResult.seriousOrAbove) {
        console.error(`    - ${issue.id} (${issue.impact}): ${issue.help}`);
        console.error(`      ${issue.description}`);
        console.error(`      Nodes: ${issue.nodes.join(', ')}`);
      }
    }

    if (pageResult.moderate.length) {
      console.warn('  Moderate (warning only):');
      for (const issue of pageResult.moderate) {
        console.warn(`    - ${issue.id} (${issue.impact}): ${issue.help}`);
        console.warn(`      ${issue.description}`);
        console.warn(`      Nodes: ${issue.nodes.join(', ')}`);
      }
    }
  }

  if (hasBlockingIssue) {
    console.error('\nAccessibility scan failed: serious/critical issues detected.');
    process.exit(1);
  }

  console.log('\nAccessibility scan completed with no blocking issues.');
})();

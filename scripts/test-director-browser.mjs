import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const fixture = JSON.parse(readFileSync('/private/tmp/avery-local-fixture.json','utf8'));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport, storageState: '/private/tmp/avery-local-browser-state.json' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3017/dashboard/director', { waitUntil: 'domcontentloaded' });
    await page.getByText('Supervised objectives · saved-record reviews', { exact: true }).waitFor({ timeout: 60000 });
    const skip = page.getByRole('button', { name: 'Skip', exact: true });
    if (await skip.isVisible()) await skip.click();
    await page.getByText('Supervised objectives · saved-record reviews', { exact: true }).click();
    await page.getByLabel('Saved objective', { exact: true }).selectOption(fixture.goalIds[0]);
    await page.getByText(/Health Advisor: record preparation · (planned|verified)/).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Ask Avery to plan or review', exact: true }).isDisabled(), true);
    const planDisabled = await context.request.post('http://127.0.0.1:3017/api/director/assignments', { data: { action: 'reason', goalId: fixture.goalIds[0] } });
    assert.equal(planDisabled.status(), 503, 'disabled reasoning must not call a paid provider');
    const denied = await context.request.post('http://127.0.0.1:3017/api/director/assignments', { data: { action: 'resume', goalId: fixture.goalIds[1] } });
    assert.equal(denied.status(), 404, 'real authenticated API rejects another customer goal');
    if (viewport.width === 1440) {
      await page.getByRole('button', { name: 'Run approved checkpoints', exact: true }).click();
      await page.getByText('2 of 2 saved-record checkpoints verified', { exact: true }).waitFor({ timeout: 30000 });
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Supervised objectives · saved-record reviews', { exact: true }).click();
    await page.getByLabel('Saved objective', { exact: true }).selectOption(fixture.goalIds[0]);
    await page.getByText('2 of 2 saved-record checkpoints verified', { exact: true }).waitFor();
    const repeatedRequest=page.waitForResponse(r=>r.url().endsWith('/api/director/assignments')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Run approved checkpoints',exact:true}).click();
    assert.equal((await repeatedRequest).status(),200,'checkpoint controls remain usable at every tested width');
    const resumed = await context.request.post('http://127.0.0.1:3017/api/director/assignments', { data: { action: 'supervise', goalId: fixture.goalIds[0] } });
    const payload = await resumed.json();
    assert.equal(resumed.status(), 200);
    assert.ok(payload.assignments.every(task => task.attempts === 1 && task.status === 'verified'), 'repeat does not duplicate tools');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, `horizontal overflow at ${viewport.width}`);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/private/tmp/avery-director-${viewport.width}.png`, fullPage: true });
    results.push({ viewport, status: 'pass', realLocalAuth: true, paidCalls: 0 });
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync('/private/tmp/avery-director-browser-results.json', JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));

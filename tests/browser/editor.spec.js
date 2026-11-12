import { test, expect } from '@playwright/test';

test('sculpt a stroke, undo/redo, fit slopes and save a portable project', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#viewport canvas')).toBeVisible();
  await expect(page.locator('#piece-count')).toHaveText('0');
  await page.getByRole('button', { name: 'Top view', exact: true }).click();
  const canvas = await page.locator('#viewport canvas').boundingBox();
  const x = canvas.x + canvas.width * 0.5, y = canvas.y + canvas.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.move(x + 70, y + 20, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#piece-count')).not.toHaveText('0');
  const count = await page.locator('#piece-count').innerText();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('#piece-count')).toHaveText('0');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('#piece-count')).toHaveText(count);
  await page.getByRole('button', { name: 'Clear terrain', exact: true }).click();
  await page.locator('#demo').click();
  await expect(page.locator('#slope-count')).not.toHaveText('0');
  await page.locator('#slopes').uncheck({ force: true });
  await expect(page.locator('#slope-count')).toHaveText('0');
  await page.locator('#slopes').check({ force: true });
  await expect(page.locator('#slope-count')).not.toHaveText('0');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#save').click();
  const download = await downloadPromise;
  const project = JSON.parse(await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString()));
  expect(project.format).toBe('brickscape');
  expect(project.heights.some(h => h > 0)).toBeTruthy();
  await page.getByRole('button', { name: 'Perspective view', exact: true }).click();
  await page.screenshot({ path: 'test-results/landscape.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('navigation never paints, imports validate, and local save survives reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('#demo').click();
  const count = await page.locator('#piece-count').innerText();
  await page.locator('#navigate').click();
  const box = await page.locator('#viewport canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 40, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('#piece-count')).toHaveText(count);
  await page.locator('#file-input').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"brickscape","size":99999}') });
  await expect(page.locator('#toast')).toContainText('Could not open');
  await expect(page.locator('#piece-count')).toHaveText(count);
  await page.reload();
  await expect(page.locator('#piece-count')).toHaveText(count);
});

test('mobile layout keeps the workspace and controls accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#viewport canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator('#demo').click();
  await expect(page.locator('#piece-count')).not.toHaveText('0');
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('flatten and paint change exported terrain, valid import restores it, and release outside ends a stroke', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Top view', exact: true }).click();
  await page.locator('[data-tool=flatten]').click();
  await expect(page.locator('#flatten-setting')).toBeVisible();
  const box = await page.locator('#viewport canvas').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  await expect(page.locator('#piece-count')).not.toHaveText('0');
  await page.locator('[data-tool=paint]').click();
  await page.getByRole('button', { name: 'Water blue', exact: true }).click();
  await page.mouse.click(cx, cy);
  const downloaded = page.waitForEvent('download');
  await page.locator('#save').click();
  const stream = await (await downloaded).createReadStream();
  const json = Buffer.concat(await stream.toArray()).toString();
  const data = JSON.parse(json);
  expect(data.heights.some(h => h === 6)).toBeTruthy();
  expect(data.colors.some(c => c === 5)).toBeTruthy();
  const previousCount = await page.locator('#piece-count').innerText();
  await page.locator('#clear').click();
  await page.locator('#file-input').setInputFiles({ name: 'terrain.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.locator('#piece-count')).toHaveText(previousCount);
  await page.locator('[data-tool=raise]').click();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(2, 2, { steps: 8 });
  await page.mouse.up();
  await page.mouse.move(cx, cy);
  const snapshot = await page.evaluate(() => localStorage.getItem('brickscape-project-v1'));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => localStorage.getItem('brickscape-project-v1'))).toBe(snapshot);
});

test('a brush stroke that changes nothing preserves the redo history', async ({ page }) => {
  await page.goto('/');
  await page.locator('#demo').click();
  const count = await page.locator('#piece-count').innerText();
  await page.locator('#undo').click();
  await expect(page.locator('#piece-count')).toHaveText('0');
  await page.getByRole('button', { name: 'Top view', exact: true }).click();
  await page.locator('[data-tool=lower]').click();
  const box = await page.locator('#viewport canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator('#redo').click();
  await expect(page.locator('#piece-count')).toHaveText(count);
});

test('workspace drags stay in the editor instead of starting browser selection or native dragging', async ({ page }) => {
  await page.goto('/');
  await page.locator('#viewport canvas').waitFor();
  // Dragging the overlaid heading must not select text across the canvas.
  const heading = await page.locator('.scene-heading h1').boundingBox();
  await page.mouse.move(heading.x + 3, heading.y + heading.height / 2);
  await page.mouse.down();
  await page.mouse.move(heading.x + 220, heading.y + heading.height / 2, { steps: 10 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.getSelection().toString())).toBe('');

  const nativeDragCancelled = await page.locator('#viewport canvas').evaluate(canvas => {
    const event = new DragEvent('dragstart', { bubbles: true, cancelable: true });
    return !canvas.dispatchEvent(event);
  });
  expect(nativeDragCancelled).toBe(true);

  await page.getByRole('button', { name: 'Top view', exact: true }).click();
  const canvas = await page.locator('#viewport canvas').boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width / 2 + 60, canvas.y + canvas.height / 2 + 20, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#piece-count')).not.toHaveText('0');
  expect(await page.evaluate(() => window.getSelection().toString())).toBe('');
});

test('cliff terrain automatically uses real steep slopes, exports them and remains undoable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a cliff landscape' }).click();
  await expect(page.locator('#inventory')).toContainText('75°');
  await expect(page.locator('#inventory')).toContainText('65°');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-parts').click();
  const stream = await (await downloadPromise).createReadStream();
  const csv = Buffer.concat(await stream.toArray()).toString();
  expect(csv).toMatch(/4460b|98560/);
  expect(csv).toMatch(/60481|3678b/);
  await page.locator('#slopes').uncheck({ force: true });
  await expect(page.locator('#slope-count')).toHaveText('0');
  await page.locator('#undo').click();
  await expect(page.locator('#inventory')).toContainText('75°');
  await page.locator('#undo').click();
  await expect(page.locator('#piece-count')).toHaveText('0');
  await page.locator('#redo').click();
  await expect(page.locator('#inventory')).toContainText('75°');
  await page.screenshot({ path: 'test-results/steep-cliffs.png', fullPage: true });
  expect(errors).toEqual([]);
});

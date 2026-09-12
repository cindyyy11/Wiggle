import { test, expect } from '@playwright/test';
import { acceptScienceInvitation } from './helpers';
import { SCIENCE_ACTIVITIES } from '../../components/science/scienceActivities';
import { scienceLand } from '../../components/science/scienceLands';

test('all lands invite, open with B or tap, and complete their own starter session', async ({ page }, info) => {
  test.setTimeout(120000);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } }); });
  await page.goto('/?world=science');
  await page.getByRole('button', { name: "Let's Wiggle", exact: true }).click();
  await expect(page.getByRole('region', { name: 'Science Planet', exact: true }).locator('canvas')).toBeVisible();
  for (const land of ['animals', 'colors', 'life-cycle'] as const) {
    await page.getByRole('button', { name: `Visit ${scienceLand(land).name}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await acceptScienceInvitation(page, land === 'animals');
    const dialog = page.getByRole('dialog', { name: `${scienceLand(land).name} activity session` });
    await expect(dialog).toBeVisible();
    if (land === 'animals') {
      await page.getByRole('button', { name: 'Use hand gestures', exact: true }).click();
      await expect(page.getByText('Camera unavailable. Use the discovery and target buttons, or retry.')).toBeVisible();
      await page.getByRole('button', { name: 'Turn camera off', exact: true }).click();
      await page.screenshot({ path: info.outputPath(`animal-session-${info.project.name}.png`) });
    }
    const activity = SCIENCE_ACTIVITIES[land];
    for (const item of activity.items) await page.getByRole('button', { name: `Discover ${item.name}`, exact: true }).click();
    await page.getByRole('button', { name: /Next:/ }).click();
    for (const item of activity.items) {
      await page.getByRole('button', { name: `Grab ${item.name}`, exact: true }).click();
      await page.getByRole('button', { name: `${activity.targets.find(target => target.id === item.target)!.name} Release here`, exact: true }).click();
    }
    await page.getByRole('button', { name: `Finish ${scienceLand(land).name}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Science Planet', exact: true }).locator('canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('invitation dismissal, focus containment and Escape return', async ({ page }) => {
  await page.goto('/?world=science');
  await page.getByRole('button', { name: "Let's Wiggle", exact: true }).click();
  await page.getByRole('button', { name: 'Visit Magnet Lands', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Not now', exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  await page.keyboard.press('b');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore Magnet Lands', exact: true }).click();
  await acceptScienceInvitation(page, true);
  const dialog = page.getByRole('dialog');
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

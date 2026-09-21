import { test, expect } from '@playwright/test';
import { acceptScienceInvitation, denyCamera } from './helpers';
import { scienceLand } from '../../components/science/scienceLands';

test('the starter lands ask for the camera on entry and show adult help when it is blocked', async ({ page }, info) => {
  test.setTimeout(120000);
  await denyCamera(page);
  await page.goto('/?world=science');
  await expect(page.getByRole('region', { name: 'Science Planet', exact: true }).locator('canvas')).toBeVisible({ timeout: 10000 });
  const calls = () => page.evaluate(() => (window as unknown as { __magnetCameraCalls(): number }).__magnetCameraCalls());
  for (const land of ['animals', 'colors', 'life-cycle'] as const) {
    await page.getByRole('button', { name: `Visit ${scienceLand(land).name}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const before = await calls();
    await acceptScienceInvitation(page, land === 'animals');
    const dialog = page.getByRole('dialog', { name: `${scienceLand(land).name} activity session` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Ask an adult to turn on the camera' })).toBeVisible();
    expect(await calls()).toBeGreaterThan(before);
    await expect(dialog.getByRole('button', { name: /^(Discover|Grab|Next:|Finish) / })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect.poll(calls).toBeGreaterThan(before + 1);
    await page.screenshot({ path: info.outputPath(`${land}-adult-help-${info.project.name}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Science Planet', exact: true }).locator('canvas')).toBeVisible();
  }
});

test('invitation dismissal, focus containment and Escape return', async ({ page }) => {
  await page.goto('/?world=science');
  await expect(page.getByRole('button', { name: 'Visit Magnet Lands', exact: true })).toBeVisible({ timeout: 10000 });
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

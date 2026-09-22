import { expect, test, type Locator, type Page } from "@playwright/test";
import { MATH_ACTIVITIES } from "../../components/math/mathActivities";

async function expectFocus(page: Page, target: Locator) {
  await expect.poll(() => target.evaluate(element => element === document.activeElement)).toBe(true);
}

async function expectWrapsBothWays(page: Page, first: Locator, last: Locator) {
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expectFocus(page, last);
  await page.keyboard.press("Tab");
  await expectFocus(page, first);
}

test("activity focus wraps around the native radio group in every question state", async ({ page }) => {
  const activity = MATH_ACTIVITIES["geometry-ridge"];
  const firstChallenge = activity.challenges[0];
  const secondChallenge = activity.challenges[1];
  const wrongAnswer = firstChallenge.options.find(option => option !== firstChallenge.answer)!;

  // Fraction Forest runs the real fractions mission; the field activities (and this focus behaviour) live in Geometry Ridge and Crystal Crater.
  await page.goto("/?world=math");
  await page.getByRole("button", { name: "Visit Geometry Ridge", exact: true }).click();
  await page.getByRole("button", { name: "Explore Geometry Ridge", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Geometry Ridge activity session" });
  const close = dialog.getByRole("button", { name: "Close activity", exact: true });
  const firstOption = dialog.getByRole("radio", { name: firstChallenge.options[0], exact: true });
  await expect(dialog.getByRole("button", { name: "Check answer", exact: true })).toBeDisabled();
  await expectWrapsBothWays(page, close, firstOption);

  await dialog.getByRole("radio", { name: wrongAnswer, exact: true }).check();
  await dialog.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Try again.");
  await expect(dialog.getByRole("button", { name: "Check answer", exact: true })).toBeDisabled();
  await expectFocus(page, firstOption);
  await expectWrapsBothWays(page, close, firstOption);

  await dialog.getByRole("radio", { name: firstChallenge.answer, exact: true }).check();
  await dialog.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: secondChallenge.prompt, exact: true })).toBeFocused();
  const nextFirstOption = dialog.getByRole("radio", { name: secondChallenge.options[0], exact: true });
  await expect(dialog.getByRole("button", { name: "Check answer", exact: true })).toBeDisabled();
  await expectWrapsBothWays(page, close, nextFirstOption);
});

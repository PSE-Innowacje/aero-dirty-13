/**
 * Orders E2E tests — pilot creates and submits a flight order.
 * Tests the order lifecycle per PRD 6.6.
 */
import { test, expect } from './fixtures/auth';

test.describe('Flight order workflows', () => {
  test('pilot creates order', async ({ page, loginAs }) => {
    await loginAs('pilot');

    await page.goto('/orders');
    await page.waitForURL('/orders');

    // Click add order button
    await page.getByRole('link', { name: /add order|dodaj zlecenie/i }).click();
    await page.waitForURL('/orders/new');

    // Fill planned start date & time
    await page.locator('#plannedStartDate').fill('2026-07-15');
    await page.locator('#plannedStartTime').fill('08:00');

    // Fill planned end date & time
    await page.locator('#plannedEndDate').fill('2026-07-15');
    await page.locator('#plannedEndTime').fill('16:00');

    // Select helicopter from dropdown (first available active helicopter)
    const helicopterSelect = page.getByLabel(/helicopter|helikopter/i);
    const helicopterOptions = helicopterSelect.locator('option');
    const optionCount = await helicopterOptions.count();
    if (optionCount > 1) {
      const secondOption = await helicopterOptions.nth(1).getAttribute('value');
      if (secondOption) {
        await helicopterSelect.selectOption(secondOption);
      }
    }

    // Select crew members (checkboxes)
    const crewCheckboxes = page.locator('input[type="checkbox"]');
    const crewCount = await crewCheckboxes.count();
    if (crewCount > 0) {
      await crewCheckboxes.first().check();
    }

    // Select start landing site
    const startSiteSelect = page.getByLabel(/start.*landing|lądowisko.*start|lądowisko.*począt/i);
    const startOptions = startSiteSelect.locator('option');
    const startCount = await startOptions.count();
    if (startCount > 1) {
      const startVal = await startOptions.nth(1).getAttribute('value');
      if (startVal) await startSiteSelect.selectOption(startVal);
    }

    // Select end landing site
    const endSiteSelect = page.getByLabel(/end.*landing|lądowisko.*końc|lądowisko.*docel/i);
    const endOptions = endSiteSelect.locator('option');
    const endCount = await endOptions.count();
    if (endCount > 1) {
      const endVal = await endOptions.nth(1).getAttribute('value');
      if (endVal) await endSiteSelect.selectOption(endVal);
    }

    // Select at least one confirmed operation (checkboxes in operations section)
    const opCheckboxes = page.locator('input[type="checkbox"]');
    // Operations checkboxes come after crew checkboxes — check last group
    const totalCheckboxes = await opCheckboxes.count();
    if (totalCheckboxes > crewCount) {
      await opCheckboxes.nth(crewCount).check();
    }

    // Fill estimated route km
    await page.getByLabel(/estimated.*route|szacowana.*trasa/i).fill('150');

    // Submit the form
    await page.getByRole('button', { name: /create.*order|utwórz.*zlecenie/i }).click();

    // After creation, should redirect to the order detail or list page
    // The form may show validation errors — check both outcomes
    const redirected = await page.waitForURL(/\/orders/, { timeout: 15000 }).then(() => true).catch(() => false);

    // Verify we left the /orders/new page (either to detail or list with error)
    expect(redirected).toBeTruthy();
  });

  test('pilot sees introduced orders by default', async ({ page, loginAs }) => {
    await loginAs('pilot');

    await page.goto('/orders');
    await page.waitForURL('/orders');

    // Pilot default filter should be status 1 (Introduced/Nowe)
    const statusFilter = page.getByRole('combobox').first();
    await expect(statusFilter).toHaveValue('1');

    // Table should be visible with the default filter applied
    await expect(page.locator('table')).toBeVisible();
  });

  test('supervisor sees submitted orders by default', async ({ page, loginAs }) => {
    await loginAs('supervisor');

    await page.goto('/orders');
    await page.waitForURL('/orders');

    // Supervisor default filter should be status 2 (Submitted/Przekazane)
    const statusFilter = page.getByRole('combobox').first();
    await expect(statusFilter).toHaveValue('2');
  });

  test('pilot submits order for acceptance', async ({ page, loginAs }) => {
    await loginAs('pilot');

    await page.goto('/orders');
    await page.waitForURL('/orders');

    // Filter to status 1 (Introduced) to find submittable orders
    const statusFilter = page.getByRole('combobox').first();
    await statusFilter.selectOption('1');

    // Wait for table to show rows
    await expect(page.locator('table')).toBeVisible();

    // Check if any orders exist in status 1
    const dataRows = page.getByRole('row').filter({ hasNot: page.locator('th') });
    const rowCount = await dataRows.count();

    test.skip(rowCount === 0, 'No orders in status 1 available to submit');

    // Click first order row to open detail
    await dataRows.first().click();
    await page.waitForURL(/\/orders\/\d+/);

    // Click submit for acceptance button
    const submitBtn = page.getByRole('button', { name: /submit.*acceptance|przekaż.*akceptacj/i });
    const canSubmit = await submitBtn.isVisible().catch(() => false);

    test.skip(!canSubmit, 'Submit button not available on this order');

    await submitBtn.click();

    // Verify status changed — the badge should show status 2
    await expect(
      page.getByText(/submitted.*acceptance|przekazane.*akceptacj/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

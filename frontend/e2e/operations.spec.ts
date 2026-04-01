/**
 * Operations E2E tests — create, confirm, resign workflows.
 * Tests the multi-role operation lifecycle per PRD 6.5.
 */
import { test, expect } from './fixtures/auth';

test.describe('Operation workflows', () => {
  test('planner creates operation', async ({ page, loginAs }) => {
    await loginAs('planner');

    await page.goto('/operations');
    await page.waitForURL('/operations');

    // Click add operation button
    await page.getByRole('link', { name: /add operation|dodaj operację/i }).click();
    await page.waitForURL('/operations/new');

    // Fill order number (PL label: "Nr zlecenia", EN: "Order no.")
    await page.getByLabel(/order.*no|nr.*zlecenia/i).fill('OP-E2E-001');

    // Fill short description
    await page.getByLabel(/short description|krótki opis/i).fill('E2E Test Op');

    // Check at least one activity type checkbox
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();

    // Fill proposed dates
    await page.getByLabel(/proposed.*from|proponowana.*od/i).fill('2026-06-01');
    await page.getByLabel(/proposed.*to|proponowana.*do/i).fill('2026-06-30');

    // Submit the form
    await page.getByRole('button', { name: /create.*operation|utwórz.*operację/i }).click();

    // After creation, should redirect to the operation detail page
    await page.waitForURL(/\/operations\/\d+/);

    // Verify operation details are visible
    await expect(page.getByText('OP-E2E-001')).toBeVisible();
    await expect(page.getByText('E2E Test Op')).toBeVisible();
  });

  test('supervisor confirms operation', async ({ page, loginAs }) => {
    await loginAs('supervisor');

    await page.goto('/operations');
    await page.waitForURL('/operations');

    // Filter by status 1 (Introduced) to find confirmable operations
    const statusFilter = page.getByRole('combobox').first();
    await statusFilter.selectOption('1');

    // Wait for table to update
    await expect(page.locator('table')).toBeVisible();

    // Look for a confirm button
    const confirmButton = page.getByRole('button', { name: /confirm|potwierdź/i }).first();
    const hasConfirmable = await confirmButton.isVisible().catch(() => false);

    test.skip(!hasConfirmable, 'No operations in status 1 available to confirm');

    await confirmButton.click();

    // Fill planned dates in the confirm dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const dateInputs = dialog.locator('input[type="date"]');
    await dateInputs.first().fill('2026-07-01');
    await dateInputs.last().fill('2026-07-31');

    // Click confirm button in dialog
    await dialog.getByRole('button', { name: /confirm|potwierdź/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();
  });

  test('planner resigns from operation', async ({ page, loginAs }) => {
    await loginAs('planner');

    await page.goto('/operations');
    await page.waitForURL('/operations');

    // Try status 3 (Confirmed) — planner can resign from these
    const statusFilter = page.getByRole('combobox').first();
    await statusFilter.selectOption('3');

    await expect(page.locator('table')).toBeVisible();

    const resignButton = page.getByRole('button', { name: /resign|rezygnuj/i }).first();
    const hasResignable = await resignButton.isVisible().catch(() => false);

    if (!hasResignable) {
      // Try status 1 (Introduced) — planner can also resign from these
      await statusFilter.selectOption('1');
      await expect(page.locator('table')).toBeVisible();
    }

    const resignBtn = page.getByRole('button', { name: /resign|rezygnuj/i }).first();
    const canResign = await resignBtn.isVisible().catch(() => false);

    test.skip(!canResign, 'No operations available for planner to resign from');

    await resignBtn.click();

    // Confirm resign dialog if it appears
    const dialog = page.getByRole('dialog');
    const dialogVisible = await dialog.isVisible().catch(() => false);
    if (dialogVisible) {
      await dialog.getByRole('button', { name: /resign|rezygnuj/i }).click();
      await expect(dialog).not.toBeVisible();
    }
  });
});

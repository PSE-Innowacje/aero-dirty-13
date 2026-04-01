/**
 * CRUD E2E tests — Helicopter resource management.
 * All tests run as admin who has full CRUD access to /helicopters.
 */
import { test, expect } from './fixtures/auth';

test.describe.serial('Helicopter CRUD', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  test('create new helicopter', async ({ page }) => {
    await page.goto('/helicopters');
    await page.waitForURL('/helicopters');

    // Click the add button
    await page.getByRole('link', { name: /add helicopter|dodaj helikopter/i }).click();
    await page.waitForURL('/helicopters/new');

    // Fill the form
    await page.getByLabel(/registration|rejestrac/i).fill('SP-TEST1');
    await page.getByLabel(/type|typ/i).first().fill('Test Heli');
    await page.getByLabel(/max crew|maks.*załog/i).fill('4');
    await page.getByLabel(/max payload|maks.*ładown/i).fill('500');

    // Select status "aktywny" — it should be selected by default,
    // but let's verify and set explicitly
    await page.getByLabel(/status/i).selectOption('aktywny');

    // Inspection date (required when status is aktywny)
    await page.getByLabel(/inspection|przegl/i).fill('2026-12-31');

    // Range
    await page.getByLabel(/range|zasięg/i).fill('200');

    // Submit
    await page.getByRole('button', { name: /create|utwórz/i }).click();

    // Should redirect back to list
    await page.waitForURL('/helicopters');

    // Verify the new helicopter appears in the list
    await expect(page.getByText('SP-TEST1')).toBeVisible();
    await expect(page.getByText('Test Heli')).toBeVisible();
  });

  test('edit helicopter', async ({ page }) => {
    await page.goto('/helicopters');
    await page.waitForURL('/helicopters');

    // Find SP-TEST1 row and click edit
    const row = page.getByRole('row').filter({ hasText: 'SP-TEST1' });
    await expect(row).toBeVisible();

    await row.getByRole('link', { name: /edit|edytuj/i }).click();
    await page.waitForURL(/\/helicopters\/\d+\/edit/);

    // Change the type
    const typeInput = page.getByLabel(/type|typ/i).first();
    await typeInput.clear();
    await typeInput.fill('Updated Heli');

    // Save
    await page.getByRole('button', { name: /save|zapisz/i }).click();

    // Should redirect back to list
    await page.waitForURL('/helicopters');

    // Verify the updated type
    await expect(page.getByText('Updated Heli')).toBeVisible();
  });

  test('delete helicopter', async ({ page }) => {
    await page.goto('/helicopters');
    await page.waitForURL('/helicopters');

    // Find SP-TEST1 row
    const row = page.getByRole('row').filter({ hasText: 'SP-TEST1' });
    await expect(row).toBeVisible();

    // Click delete button (trash icon button)
    await row.getByRole('button', { name: /delete|usuń/i }).click();

    // Confirm deletion in dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /delete|usuń/i }).click();

    // Verify removed from list — use table cell to avoid matching dialog text
    await expect(page.getByRole('cell', { name: 'SP-TEST1' })).not.toBeVisible();
  });

  test('form validation prevents submission of empty form', async ({ page }) => {
    await page.goto('/helicopters/new');
    await page.waitForURL('/helicopters/new');

    // Try to submit empty form — browser native or client-side validation should prevent it
    await page.getByRole('button', { name: /create|utwórz/i }).click();

    // Should still be on the form page (not redirected to list)
    await expect(page).toHaveURL(/\/helicopters\/new/);

    // Fill only registration to bypass native required, but leave type empty
    await page.getByLabel(/registration|rejestrac/i).fill('SP-VALID-TEST');
    await page.getByRole('button', { name: /create|utwórz/i }).click();

    // Still on form page — type is also required
    await expect(page).toHaveURL(/\/helicopters\/new/);
  });
});

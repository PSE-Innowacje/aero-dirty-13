/**
 * RBAC E2E tests — verify role-based access control on sidebar navigation,
 * page access restrictions, and action button visibility.
 */
import { test, expect } from './fixtures/auth';

test.describe('Role-based access control', () => {
  test('planner cannot see admin menu items', async ({ page, loginAs }) => {
    await loginAs('planner');

    // Planner role ("Osoba planujaca") only has access to the "operations" group
    // They should NOT see admin group items: Users, Helicopters, Crew Members, Landing Sites
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // These sidebar links should NOT be visible for planner
    await expect(sidebar.getByRole('link', { name: /users|użytkownicy/i })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: /helicopters|helikoptery/i })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: /crew|załog/i })).not.toBeVisible();
    await expect(sidebar.getByRole('link', { name: /landing.*sites|lądowisk/i })).not.toBeVisible();

    // Orders should also NOT be visible for planner
    await expect(sidebar.getByRole('link', { name: /flight.*orders|zlecenia.*lotnicze/i })).not.toBeVisible();

    // Operations should be visible
    await expect(sidebar.getByRole('link', { name: /flight.*operations|operacje.*lotnicze/i })).toBeVisible();
  });

  test('planner redirected from /users', async ({ page, loginAs }) => {
    await loginAs('planner');

    // Navigate directly to /users
    await page.goto('/users');

    // Planner should be redirected to /operations (their fallback per RoleGuard)
    await page.waitForURL('/operations');
    await expect(page).toHaveURL(/\/operations/);
  });

  test('admin sees all menu items', async ({ page, loginAs }) => {
    await loginAs('admin');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Admin should see all navigation groups and items
    // Admin group items
    await expect(sidebar.getByRole('link', { name: /helicopters|helikoptery/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /crew|załog/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /landing.*sites|lądowisk/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /users|użytkownicy/i })).toBeVisible();

    // Operations group
    await expect(sidebar.getByRole('link', { name: /flight.*operations|operacje.*lotnicze/i })).toBeVisible();

    // Orders group
    await expect(sidebar.getByRole('link', { name: /flight.*orders|zlecenia.*lotnicze/i })).toBeVisible();
  });

  test('pilot sees add order button', async ({ page, loginAs }) => {
    await loginAs('pilot');

    await page.goto('/orders');
    await page.waitForURL('/orders');

    // Pilot (canCreate === true) should see the add order button
    await expect(
      page.getByRole('link', { name: /add order|dodaj zlecenie/i })
    ).toBeVisible();
  });

  test('planner does not see add order button', async ({ page, loginAs }) => {
    await loginAs('planner');

    // Planner doesn't have access to /orders (RoleGuard excludes "Osoba planujaca")
    // so navigating there should redirect them to /operations
    await page.goto('/orders');
    await page.waitForURL('/operations');

    // Verify we were redirected and are NOT on the orders page
    await expect(page).toHaveURL(/\/operations/);
  });
});

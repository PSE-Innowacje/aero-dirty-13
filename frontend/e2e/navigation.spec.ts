/**
 * Navigation E2E tests — sidebar menus, RBAC visibility, collapse/expand,
 * page rendering, theme toggle, language toggle.
 *
 * The app uses Polish (pl) as the default language.
 * Sidebar menu items are RBAC-filtered per PRD 7.2.
 */
import { test, expect } from './fixtures/auth';

test.describe('Sidebar menu items per role', () => {
  test('sidebar shows correct menu items for admin', async ({ page, loginAs }) => {
    await loginAs('admin');
    // Dashboard is now the landing page (no redirect)
    await page.waitForURL('**/', { timeout: 10_000 });

    const sidebar = page.locator('aside');

    // Admin sees all groups: admin (Helicopters, Crew, Landing Sites, Users),
    // operations (Operations), orders (Orders)
    // Polish labels from translation keys
    await expect(sidebar.getByText('Helikoptery')).toBeVisible();
    await expect(sidebar.getByText('Członkowie załogi')).toBeVisible();
    await expect(sidebar.getByText('Lądowiska planowe')).toBeVisible();
    await expect(sidebar.getByText('Użytkownicy')).toBeVisible();
    await expect(sidebar.getByText('Lista operacji')).toBeVisible();
    await expect(sidebar.getByText('Lista zleceń')).toBeVisible();
  });

  test('sidebar shows limited menu for planner', async ({ page, loginAs }) => {
    await loginAs('planner');
    await page.waitForURL('**/', { timeout: 10_000 });

    const sidebar = page.locator('aside');

    // Planner sees only the operations group
    await expect(sidebar.getByText('Lista operacji')).toBeVisible();

    // Planner should NOT see admin-only items
    await expect(sidebar.getByText('Helikoptery')).not.toBeVisible();
    await expect(sidebar.getByText('Członkowie załogi')).not.toBeVisible();
    await expect(sidebar.getByText('Lądowiska planowe')).not.toBeVisible();
    await expect(sidebar.getByText('Użytkownicy')).not.toBeVisible();
    await expect(sidebar.getByText('Lista zleceń')).not.toBeVisible();
  });
});

test.describe('Sidebar collapse/expand', () => {
  test('sidebar collapse/expand works', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.waitForURL('**/', { timeout: 10_000 });

    const sidebar = page.locator('aside');

    // Sidebar starts expanded (w-64 = 256px)
    await expect(sidebar).toBeVisible();
    const expandedWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
    expect(expandedWidth).toBeGreaterThanOrEqual(200); // w-64 = 256px

    // Click the collapse toggle button
    const collapseButton = page.getByRole('button', { name: /collapse sidebar/i });
    await collapseButton.click();

    // Wait for sidebar to actually collapse (poll until width < 80)
    await expect(async () => {
      const w = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
      expect(w).toBeLessThanOrEqual(80);
    }).toPass({ timeout: 3000 });

    // Click expand button to restore
    const expandButton = page.getByRole('button', { name: /expand sidebar/i });
    await expandButton.click();

    // Wait for sidebar to expand back
    await expect(async () => {
      const w = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
      expect(w).toBeGreaterThanOrEqual(200);
    }).toPass({ timeout: 3000 });
  });
});

test.describe('Page rendering', () => {
  test('each page loads without errors', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.waitForURL('**/', { timeout: 10_000 });

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const pages = [
      { path: '/', content: /panel operacyjny|operational panel/i },
      { path: '/users', content: /użytkownicy|users/i },
      { path: '/helicopters', content: /helikoptery|helicopters/i },
      { path: '/crew', content: /członkowie załogi|crew members/i },
      { path: '/landing-sites', content: /lądowiska|landing sites/i },
      { path: '/operations', content: /operacje|operations/i },
      { path: '/orders', content: /zlecenia|orders/i },
    ];

    for (const { path, content } of pages) {
      await page.goto(path);
      await page.waitForURL(`**${path}`, { timeout: 10_000 });

      // Each page should render a heading or content matching its purpose
      await expect(page.locator('h1, h2, h3, table, [role="table"]').first()).toBeVisible({
        timeout: 10_000,
      });

      // Verify the page contains expected text (title or heading)
      await expect(page.getByText(content).first()).toBeVisible({ timeout: 10_000 });
    }

    // No uncaught errors in console (filter out common noise like network errors)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Theme toggle', () => {
  test('theme toggle switches between dark and light', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.waitForURL('**/', { timeout: 10_000 });

    const htmlElement = page.locator('html');

    // Default theme is dark — no .light class on <html>
    await expect(htmlElement).not.toHaveClass(/\blight\b/);

    // Find and click the theme toggle button (Sun icon in dark mode, title: "Jasny" or "Light")
    const themeButton = page.getByRole('button', { name: /jasny|light|ciemny|dark/i });
    await themeButton.click();

    // Now <html> should have .light class
    await expect(htmlElement).toHaveClass(/\blight\b/);

    // Click again to toggle back to dark
    await themeButton.click();

    // .light class should be removed
    await expect(htmlElement).not.toHaveClass(/\blight\b/);
  });
});

test.describe('Language toggle', () => {
  test('language toggle switches between pl and en', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.waitForURL('**/', { timeout: 10_000 });

    const sidebar = page.locator('aside');

    // Default language is Polish — sidebar should show Polish labels
    await expect(sidebar.getByText('Użytkownicy')).toBeVisible();
    await expect(sidebar.getByText('Helikoptery')).toBeVisible();

    // The language button shows the target language ("EN" when current is PL)
    // It uses Globe icon + text
    const langButton = sidebar.locator('button').filter({ hasText: /^EN$/ });
    await expect(langButton).toBeVisible();
    await langButton.click();

    // After switching to English, sidebar labels should update
    await expect(sidebar.getByText('Users')).toBeVisible({ timeout: 5_000 });
    await expect(sidebar.getByText('Helicopters')).toBeVisible();

    // Language button should now show "PL" (to switch back)
    const langButtonPl = sidebar.locator('button').filter({ hasText: /^PL$/ });
    await expect(langButtonPl).toBeVisible();

    // Switch back to Polish
    await langButtonPl.click();

    // Polish labels should be restored
    await expect(sidebar.getByText('Użytkownicy')).toBeVisible({ timeout: 5_000 });
    await expect(sidebar.getByText('Helikoptery')).toBeVisible();
  });
});

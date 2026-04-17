/**
 * Demo recording spec — generates docs/assets/demo.mp4 for the hackathon
 * presentation (slide 4 "Dowód"). Not part of CI regression suite.
 *
 * Run locally against docker-compose stack:
 *   cd frontend && npx playwright test e2e/demo.spec.ts --project=chromium
 *
 * Output: test-results/demo-pilot-workflow-chromium/video.webm
 * Convert to MP4: see docs/superpowers/plans/2026-04-17-aero-hackathon-presentation.md
 */
import { test } from './fixtures/auth';

test.use({
  video: { mode: 'on', size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  ignoreHTTPSErrors: true,
});

test('demo: pilot workflow', async ({ page, loginAs }) => {
  test.setTimeout(60_000);

  // 1. Login as pilot (cinematic pause for intro)
  await page.goto('/login');
  await page.waitForTimeout(800);
  await page.getByLabel(/email/i).fill('pilot@aero.local');
  await page.waitForTimeout(200);
  await page.getByLabel(/hasło|password/i).fill('pilot123');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /zaloguj|sign\s*in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  await page.waitForTimeout(1200);

  // 2. Navigate to operations list
  await page.goto('/operations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1800);

  // 3. Open first operation to show map
  const firstOperationLink = page
    .getByRole('link', { name: /DE-|^#|operacj/i })
    .first();
  if (await firstOperationLink.count() > 0) {
    await firstOperationLink.click();
  } else {
    // Fallback — click first table row action
    await page.locator('table tbody tr').first().click();
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  // Give the Leaflet map a moment to fully render + zoom
  await page.waitForTimeout(2000);

  // 4. Navigate to orders list
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // 5. Click add order
  const addOrderButton = page.getByRole('link', {
    name: /add order|dodaj zlecenie|nowe zlecenie/i,
  });
  if (await addOrderButton.count() > 0) {
    await addOrderButton.first().click();
    await page.waitForURL('/orders/new');
    await page.waitForTimeout(1500);

    // Scroll through form
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(1200);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(1200);
  }

  // 6. Return to orders list
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
});

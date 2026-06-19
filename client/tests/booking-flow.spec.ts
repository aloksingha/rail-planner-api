import { test, expect } from '@playwright/test';

test.describe('Tickets Pro Booking Flow', () => {
  const BASE_URL = 'http://localhost:5173'; // Assuming local dev server

  test('should login and search for trains', async ({ page }) => {
    // 0. Ensure clean state
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    
    // 1. Visit Login Page
    await page.goto(`${BASE_URL}/login`);
    
    // 2. Open Node Access Form
    await page.click('text=Login with Test Credentials');
    
    // 3. Fill Credentials
    await page.fill('input[placeholder*="Test Email"]', 'test@ticketspro.in');
    await page.fill('input[placeholder*="Password"]', 'test1234');
    
    // 4. Click Initialize (using Enter for reliability)
    await page.keyboard.press('Enter');
    
    // 5. Verify Redirect to Dashboard (Root)
    await page.waitForURL(/http:\/\/localhost:5173\/?$/, { timeout: 15000 });
    await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);
    
    // 6. Dismiss Modal if present
    const modalButton = page.locator('button:has-text("GOT IT, THANKS!")');
    try {
        await modalButton.waitFor({ state: 'visible', timeout: 5000 });
        await modalButton.click();
    } catch (e) {
        console.log('[SmokeTest] No welcome modal appeared or already dismissed.');
    }
    
    // 7. Verify Dashboard loads
    await expect(page.locator('text=Travel Control Node')).toBeVisible({ timeout: 15000 });

    // 7. Perform Search
    await page.goto(`${BASE_URL}/book-ticket`);
    
    // Fill From Station and select from dropdown
    await page.fill('input[placeholder="FROM"]', 'NDLS');
    await page.click('button:has-text("NDLS")');
    
    // Fill To Station and select from dropdown
    await page.fill('input[placeholder="TO"]', 'HWH');
    await page.click('button:has-text("HWH")');
    
    // Set Journey Date (3 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 4);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);
    
    await page.click('button:has-text("Search Trains")');
    
    // 8. Wait for results
    await page.waitForSelector('.train-card', { timeout: 15000 });
    const count = await page.locator('.train-card').count();
    expect(count).toBeGreaterThan(0);
    
    console.log(`[SmokeTest] Success: Found ${count} trains.`);
  });
});

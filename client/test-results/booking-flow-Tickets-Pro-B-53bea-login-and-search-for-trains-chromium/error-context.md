# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking-flow.spec.ts >> Tickets Pro Booking Flow >> should login and search for trains
- Location: tests\booking-flow.spec.ts:6:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - img "Tickets Pro" [ref=e13]
        - generic [ref=e14]: Tickets Pro
      - paragraph [ref=e17]: Integrated Cloud Intelligence
    - generic [ref=e18]:
      - generic [ref=e19]:
        - heading "Book Smarter." [level=1] [ref=e20]:
          - text: Book
          - text: Smarter.
        - paragraph [ref=e21]: Advanced availability monitoring, instant walk-in booking, and enterprise team management in a single holographic node.
      - generic [ref=e22]:
        - generic [ref=e23]: Live Availability
        - generic [ref=e24]: Manual Provisioning
        - generic [ref=e25]: Multi-Wallet Control
    - generic [ref=e26]:
      - generic [ref=e27]:
        - paragraph [ref=e28]: 13,000+
        - paragraph [ref=e29]: Trains Daily
      - generic [ref=e30]:
        - paragraph [ref=e31]: 7,000+
        - paragraph [ref=e32]: Stations
      - generic [ref=e33]:
        - paragraph [ref=e34]: ∞
        - paragraph [ref=e35]: Bookings
  - generic [ref=e37]:
    - generic [ref=e38]:
      - generic [ref=e39]:
        - heading "Command Access" [level=2] [ref=e42]
        - heading "Access Node" [level=3] [ref=e44]
        - paragraph [ref=e45]: Book tickets, manage reservations & track your journeys.
      - generic [ref=e46]: Test Login failed
      - button "G Continue with Google" [ref=e49]:
        - img "G" [ref=e52]
        - generic [ref=e53]: Continue with Google
      - generic [ref=e55]:
        - textbox "Test Email (test@ticketspro.in)" [ref=e56]: test@ticketspro.in
        - generic [ref=e57]:
          - textbox "Password (test1234)" [active] [ref=e58]: test1234
          - button "visibility" [ref=e59]:
            - generic [ref=e60]: visibility
        - generic [ref=e61]:
          - checkbox "Remember Node Access" [ref=e62] [cursor=pointer]
          - generic [ref=e63] [cursor=pointer]: Remember Node Access
        - generic [ref=e64]:
          - button "Discard" [ref=e65]
          - button "Override Node" [ref=e66]
    - paragraph [ref=e70]: Tickets Pro v3.5.4 · IR-INTELLIGENCE
    - generic [ref=e72]:
      - paragraph [ref=e73]: Build v3.5.4.FINAL (STABLE)
      - link "Download Android App LATEST v3.5.4" [ref=e74] [cursor=pointer]:
        - /url: https://rail-planner-api.onrender.com/downloads/tickets-pro-v3.5.4.apk
        - generic [ref=e76]:
          - img [ref=e77]
          - generic [ref=e79]:
            - paragraph [ref=e80]: Download Android App
            - paragraph [ref=e81]: LATEST v3.5.4
      - paragraph [ref=e82]: Available for Android 8.0+
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Tickets Pro Booking Flow', () => {
  4  |   const BASE_URL = 'http://localhost:5173'; // Assuming local dev server
  5  | 
  6  |   test('should login and search for trains', async ({ page }) => {
  7  |     // 0. Ensure clean state
  8  |     await page.goto(BASE_URL);
  9  |     await page.evaluate(() => localStorage.clear());
  10 |     await page.evaluate(() => sessionStorage.clear());
  11 |     
  12 |     // 1. Visit Login Page
  13 |     await page.goto(`${BASE_URL}/login`);
  14 |     
  15 |     // 2. Open Node Access Form
  16 |     await page.click('text=Login with Test Credentials');
  17 |     
  18 |     // 3. Fill Credentials
  19 |     await page.fill('input[placeholder*="Test Email"]', 'test@ticketspro.in');
  20 |     await page.fill('input[placeholder*="Password"]', 'test1234');
  21 |     
  22 |     // 4. Click Initialize (using Enter for reliability)
  23 |     await page.keyboard.press('Enter');
  24 |     
  25 |     // 5. Verify Redirect to Dashboard (Root)
> 26 |     await page.waitForURL(/http:\/\/localhost:5173\/?$/, { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  27 |     await expect(page).toHaveURL(/http:\/\/localhost:5173\/?$/);
  28 |     
  29 |     // 6. Dismiss Modal if present
  30 |     const modalButton = page.locator('button:has-text("GOT IT, THANKS!")');
  31 |     try {
  32 |         await modalButton.waitFor({ state: 'visible', timeout: 5000 });
  33 |         await modalButton.click();
  34 |     } catch (e) {
  35 |         console.log('[SmokeTest] No welcome modal appeared or already dismissed.');
  36 |     }
  37 |     
  38 |     // 7. Verify Dashboard loads
  39 |     await expect(page.locator('text=Travel Control Node')).toBeVisible({ timeout: 15000 });
  40 | 
  41 |     // 7. Perform Search
  42 |     await page.goto(`${BASE_URL}/book-ticket`);
  43 |     
  44 |     // Fill From Station and select from dropdown
  45 |     await page.fill('input[placeholder="FROM"]', 'NDLS');
  46 |     await page.click('button:has-text("NDLS")');
  47 |     
  48 |     // Fill To Station and select from dropdown
  49 |     await page.fill('input[placeholder="TO"]', 'HWH');
  50 |     await page.click('button:has-text("HWH")');
  51 |     
  52 |     // Set Journey Date (3 days from now)
  53 |     const futureDate = new Date();
  54 |     futureDate.setDate(futureDate.getDate() + 4);
  55 |     const dateStr = futureDate.toISOString().split('T')[0];
  56 |     await page.fill('input[type="date"]', dateStr);
  57 |     
  58 |     await page.click('button:has-text("Search Trains")');
  59 |     
  60 |     // 8. Wait for results
  61 |     await page.waitForSelector('.train-card', { timeout: 15000 });
  62 |     const count = await page.locator('.train-card').count();
  63 |     expect(count).toBeGreaterThan(0);
  64 |     
  65 |     console.log(`[SmokeTest] Success: Found ${count} trains.`);
  66 |   });
  67 | });
  68 | 
```
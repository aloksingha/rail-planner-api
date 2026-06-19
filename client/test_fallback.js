const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting Puppeteer test for Nearby Stations Fallback Search...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Setup generic user token for local testing
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
        localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'); // dummy token
        localStorage.setItem('user', JSON.stringify({
            id: '123',
            name: 'Test Customer',
            email: 'test@example.com',
            role: 'CUSTOMER',
            phone: '1234567890'
        }));
    });
    
    console.log("Navigating to Customer Dashboard...");
    await page.goto('http://localhost:5173/customer', { waitUntil: 'networkidle0' });

    console.log("Opening Ticket Booking Form...");
    await page.click('button:has-text("Book Ticket")');
    await page.waitForTimeout(2000); // Give modal time to animate in

    // 1. Enter details (PUNE -> CHM) which we know have no direct trains but ST -> CHM or PUNE -> ST might
    // Alternatively, let's use a known mapped route like NDLS -> HWH on a specific day
    
    console.log("Entering search details (NDLS to HWH)...");
    
    // Type Source NDLS
    await page.type('input[placeholder="Type to search Source"]', 'NDLS');
    await page.waitForTimeout(1000);
    const sourceOptions = await page.$$('button');
    for (const opt of sourceOptions) {
        const text = await page.evaluate(el => el.textContent, opt);
        if (text && text.includes('NDLS')) {
            await opt.click();
            break;
        }
    }
    
    // Type Dest HWH
    await page.type('input[placeholder="Type to search Destination"]', 'SDAH'); // Wait, let's search NDLS to SDF or something without direct train, but mapped. Let's just search NDLS -> SDAH. If RailRadar doesn't find direct but finds NDLS to HWH, it will fallback.
    await page.waitForTimeout(1000);
    const destOptions = await page.$$('button');
    for (const opt of destOptions) {
        const text = await page.evaluate(el => el.textContent, opt);
        if (text && text.includes('SDAH')) {
            await opt.click();
            break;
        }
    }

    // Enter Date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    // Evaluate the date input change
    await page.evaluate((date) => {
        const dateInput = document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = date;
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, dateStr);
    
    // Select Class
    await page.select('select', '3A');
    
    console.log("Clicking Search...");
    // Find search button
    const searchBtns = await page.$$('button');
    for (const btn of searchBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Search Available Trains')) {
            await btn.click();
            break;
        }
    }

    // Wait for network response
    await page.waitForTimeout(8000);
    
    console.log("Checking UI for Alternative Station badges...");
    const content = await page.content();
    
    if (content.includes('ALTERNATIVE STATION')) {
        console.log("SUCCESS: 'ALTERNATIVE STATION' badge was found on the page! Fallback logic works.");
    } else if (content.includes('No trains found')) {
        console.log("FAILED to find trains, but API returned 0. Try different route.");
    } else {
        console.log("Direct trains found. We need a route with 0 direct trains to test fallback properly.");
    }

    await browser.close();
    console.log("Test finished.");
})();

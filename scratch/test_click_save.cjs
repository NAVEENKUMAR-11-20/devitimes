const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  });
  const page = await browser.newPage();
  
  // Catch page console logs and errors
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', error => {
    console.error('PAGE UNCAUGHT ERROR:', error.message);
  });

  try {
    console.log("Navigating to Admin Login page...");
    await page.goto('http://localhost:5175/#/admin/login', { waitUntil: 'networkidle2' });

    console.log("Logging in as Admin...");
    await page.type('input[placeholder="e.g. admin"]', 'admin');
    await page.type('input[placeholder="••••••••••••"]', 'lumiere@admin2024');
    await page.click('button[type="submit"]');

    console.log("Waiting for Dashboard page load...");
    await page.waitForSelector('.admin-layout-root', { timeout: 5000 });

    console.log("Navigating to Admin Products page...");
    await page.goto('http://localhost:5175/#/admin/products', { waitUntil: 'networkidle2' });

    console.log("Waiting for Products table...");
    await page.waitForSelector('.admin-table', { timeout: 5000 });

    console.log("Clicking Edit button (pencil icon) for first product...");
    await page.click('.edit-btn');

    console.log("Waiting for Edit Modal overlay to appear...");
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });

    // Handle Alert dialog if it opens
    page.on('dialog', async dialog => {
      console.log('ALERT DIALOG OPENED:', dialog.message());
      await dialog.dismiss();
    });

    console.log("Clicking SAVE CHANGES button...");
    // Find the save changes button and click it
    await page.click('.modal-actions-row button[type="submit"]');

    console.log("Waiting 3 seconds for response/network activity...");
    await new Promise(r => setTimeout(r, 3000));

  } catch (e) {
    console.error("Test execution failed:", e.message);
  }

  console.log("Closing browser.");
  await browser.close();
})();

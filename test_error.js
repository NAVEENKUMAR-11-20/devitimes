const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE UNCAUGHT ERROR:', error.message);
  });

  console.log("Navigating to Collection page...");
  try {
    await page.goto('http://localhost:5175/#/collection', { waitUntil: 'networkidle2' });
    console.log("Waiting 3 seconds to let errors trigger...");
    await new Promise(r => setTimeout(r, 3000));
  } catch (e) {
    console.log("Navigation error:", e.message);
  }

  await browser.close();
})();

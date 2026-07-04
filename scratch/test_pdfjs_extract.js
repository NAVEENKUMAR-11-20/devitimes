import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function main() {
  const pdfPath = 'C:\\Users\\admin\\Desktop\\devi clock shop\\SAPNA QUARTZ.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file does not exist at:', pdfPath);
    return;
  }

  console.log('Reading PDF file...');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Load PDF.js CDN in the browser page
  await page.goto('about:blank');
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });
  
  await page.evaluate(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  });

  console.log('Extracting text via PDF.js...');
  const result = await page.evaluate(async (base64Data) => {
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    try {
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      const numPages = pdf.numPages;
      const pagesData = [];

      for (let pageNum = 1; pageNum <= Math.min(5, numPages); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        pagesData.push({
          pageNum,
          items: textContent.items.map(item => ({ str: item.str, transform: item.transform }))
        });
      }
      return { numPages, pagesData };
    } catch (err) {
      return { error: err.message };
    }
  }, pdfBase64);

  await browser.close();

  console.log('Result numPages:', result.numPages);
  if (result.error) {
    console.error('PDF.js Error:', result.error);
    return;
  }

  result.pagesData.forEach(p => {
    console.log(`\n--- PAGE ${p.pageNum} ---`);
    console.log('Item count:', p.items.length);
    const joined = p.items.map(item => item.str).join(' ');
    console.log('Joined text:', joined);
  });
}

main().catch(console.error);

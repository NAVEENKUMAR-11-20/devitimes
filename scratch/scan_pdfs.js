import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function scanPdf(pdfPath) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });
  await page.evaluate(() => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  });

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
      const pagesText = {};

      for (let pageNum = 65; pageNum <= 72; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        pagesText[pageNum] = textContent.items.map(item => item.str).join(' ');
      }
      return pagesText;
    } catch (err) {
      return { error: err.message };
    }
  }, pdfBase64);

  await browser.close();
  return result;
}

async function main() {
  const fullPath = 'C:\\Users\\admin\\Desktop\\devi clock shop\\SAPNA QUARTZ.pdf';
  const res = await scanPdf(fullPath);
  for (const [pageNum, text] of Object.entries(res)) {
    console.log(`Page ${pageNum}: "${text}"`);
  }
}

main().catch(console.error);

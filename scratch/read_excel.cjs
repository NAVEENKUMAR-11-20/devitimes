const XLSX = require('xlsx');

async function run() {
  try {
    const filePath = 'c:\\Users\\admin\\Downloads\\Products_Export_2026-06-08.xlsx';
    console.log(`Reading excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    console.log('Sheet Names:', sheetNames);
    
    // Read the first sheet
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('Total rows:', data.length);
    console.log('Headers (Row 1):', data[0]);
    if (data.length > 1) {
      console.log('Sample Row 2:', data[1]);
    }
  } catch (err) {
    console.error('Error reading excel:', err);
  }
}
run();

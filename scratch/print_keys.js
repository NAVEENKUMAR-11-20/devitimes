const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pocketbase-production-ec1e.up.railway.app');

async function printKeys() {
  try {
    const list = await pb.collection('PRODUCT_DATAS').getFullList();
    if (list.length > 0) {
      console.log('Keys of first record:', Object.keys(list[0]));
      console.log('First record raw data:', JSON.stringify(list[0], null, 2));
    } else {
      console.log('No records found in PRODUCT_DATAS');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
printKeys();

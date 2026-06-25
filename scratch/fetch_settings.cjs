const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pocketbase-production-ec1e.up.railway.app');

async function test() {
  try {
    const records = await pb.collection('app_settings').getFullList();
    console.log('RECORDS:', JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();

const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pocketbase-production-ec1e.up.railway.app');

async function test() {
  try {
    // PocketBase collections list is usually not accessible without admin credentials,
    // but let's try to query some standard endpoints or guess collections.
    console.log('Testing collections access...');
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();

const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

const names = [
  'clocks', 'Clocks', 'clock', 'Clock',
  'catalogue', 'Catalogue', 'catalog', 'Catalog',
  'store', 'Store', 'settings', 'Settings',
  'wholesale', 'Wholesale', 'retail', 'Retail',
  'devi_times', 'devitimes', 'devi_clocks', 'deviclocks'
];

async function run() {
  for (const name of names) {
    try {
      const list = await pb.collection(name).getFullList({
        requestKey: null,
      });
      console.log(`[SUCCESS] '${name}': Got ${list.length} records`);
    } catch (err) {
      if (err.status !== 404) {
        console.log(`[FOUND BUT ERROR] '${name}': Status ${err.status} - ${err.message}`);
      }
    }
  }
}
run();

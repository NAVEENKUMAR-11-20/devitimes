const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase("https://pocketbase-production-ec1e.up.railway.app");

const names = [
  'products', 'Products', 'product', 'Product',
  'retail_products', 'Retail_products', 'Retail_Products', 'retail_product', 'Retail_product',
  'items', 'Items', 'item', 'Item',
  'inventory', 'Inventory',
  'registered_users', 'registered_user', 'Registered_users', 'User', 'users', 'Users'
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
      } else {
        // console.log(`[404] '${name}'`);
      }
    }
  }
}
run();

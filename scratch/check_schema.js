import pb from '../src/lib/pocketbase.js';

async function checkSchema() {
  try {
    const records = await pb.collection('PRODUCT_DATAS').getList(1, 1);
    if (records.items.length > 0) {
      console.log('Sample product record from PocketBase:');
      console.log(JSON.stringify(records.items[0], null, 2));
    } else {
      console.log('No products found in PRODUCT_DATAS collection.');
    }
  } catch (err) {
    console.error('Error fetching from PocketBase:', err);
  }
}

checkSchema();

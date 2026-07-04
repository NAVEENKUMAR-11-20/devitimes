import pb from '../src/lib/pocketbase.js';

async function checkAllKeys() {
  try {
    const list = await pb.collection('PRODUCT_DATAS').getFullList({ limit: 10 });
    const allKeys = new Set();
    list.forEach(item => {
      Object.keys(item).forEach(k => allKeys.add(k));
    });
    console.log('All unique keys across all PRODUCT_DATAS records:', Array.from(allKeys));
    console.log('Sample product record from PocketBase:');
    if (list.length > 0) {
      console.log(JSON.stringify(list[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkAllKeys();
